const BaseApp = require('./base-app');
const express = require('express');
const axios = require('axios');
const HttpCodes = require('http-status-codes');

module.exports = class extends BaseApp {
  constructor(dirname, config, routing, extraPluginsFunction) {
    super(dirname, config, routing, extraPluginsFunction);
    this.registry = new Map();
    this.registryLoadBalanceIndex = 0;
    this.registrationTimeout = this.defaultRegistryTimeout;
  }

  buildService(config) {
    const router = express.Router();
    this.buildRegistryRouter(router);
    this.app.use(this.registryEndpoint, router);
    this.app.use((req, res, next) => {
      if (!req.route) {
        this.tryRouteToMicroservice(req, res);
      }
    });
    this.healthCheckTimeout = config.healthCheckTimeout || 10000
    setInterval(() => this.healthCheck(config), config.healthCheckFrequency || 60000);
  }

  buildRegistryRouter(router) {
    router.get('/', (req, res, next) => {
      res.send([...this.registry]);
      next();
    });
    router.post('/', (req, res, next) => {
      this.modifyRegistry(req, res, req.body, (services, serviceUrl) =>
        [...services, serviceUrl]);
      next();
    });
    router.delete('/', (req, res, next) => {
      this.modifyRegistry(req, res, req.query, (services, serviceUrl) =>
        services.filter(url => url !== serviceUrl));
      next();
    });
  }

  modifyRegistry(req, res, paramsSource, modificationFunction) {
    const {serviceUrl, prefix} = paramsSource;
    if (!serviceUrl || !prefix) {
      throw new Error('Parameters serviceUrl and prefix not provided');
    }
    let endpointServices = this.registry.get(prefix) || [];
    endpointServices = modificationFunction(endpointServices, serviceUrl);
    this.registry.set(prefix, endpointServices);
    res.sendStatus(HttpCodes.OK);
  }

  tryRouteToMicroservice(req, res) {
    const url = req.url || '';
    const urlParts = url.split('/');
    if (urlParts.length > 0) {
      const prefix = '/' + urlParts[1];
      let microserviceUrl = this.getBalancedMicroserviceUrl(prefix);
      if (microserviceUrl) {
        const requestUrl = microserviceUrl + url.replace(prefix, '');
        this.redirectRequest(req, res, url, requestUrl);
      } else {
        this.handleHttpError(res, HttpCodes.NOT_FOUND);
      }
    }
  }

  healthCheck() {
    console.log('Sending health checks');
    for (const [prefix, serviceUrls] of this.registry) {
      for (const serviceUrl of serviceUrls) {
        axios.get(serviceUrl + this.healthCheckEndpoint, {timeout: this.healthCheckTimeout}).catch(() => {
          const endpointServices = (this.registry.get(prefix) || []).filter(url => url !== serviceUrl);
          this.registry.set(prefix, endpointServices);
          console.warn(`Deleted ${serviceUrl} from ${prefix} poll`);
        });
      }
    }
  }

  getBalancedMicroserviceUrl(prefix) {
    const microserviceUrlsByPrefix = this.registry.get(prefix) || [];
    if (this.registryLoadBalanceIndex >= microserviceUrlsByPrefix.length) {
      this.registryLoadBalanceIndex = 0;
    }
    return microserviceUrlsByPrefix[this.registryLoadBalanceIndex++];
  }

  redirectRequest(req, res, url, requestUrl) {
    const {method, params, data} = req;
    axios.request({method: method, timeout: this.registrationTimeout, url: requestUrl, params: params, data: data})
      .then((microserviceResponse) => {
        console.log(`Redirect ${url} to ${requestUrl}`);
        res.send(microserviceResponse.data);
        res.end();
      })
      .catch(() => {
        this.handleHttpError(res, HttpCodes.NOT_FOUND);
      });
  }
}
