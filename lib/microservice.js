const BaseApp = require('./base-app');
const express = require('express');
const axios = require('axios');
const url = require('url');
const HttpCodes = require('http-status-codes');

module.exports = class extends BaseApp {
  buildService(config) {
    const {host, prefix, gateway} = config;
    const serviceUrl = `${host}:${process.env.PORT || '8080'}`;
    const params = {serviceUrl, prefix};
    const timeout = config.timeout || this.defaultRegistryTimeout;
    const gatewayUrl = url.resolve(gateway, this.registryEndpoint);
    axios.post(gatewayUrl, params, {timeout}).catch(this.handleGatewayError);
    const router = express.Router();
    router.get(this.healthCheckEndpoint, (req, res, next) => {
      res.sendStatus(HttpCodes.OK);
    });
    this.app.use('/', router)
    process.on('SIGINT', () => {
      axios.delete(gatewayUrl, {params, timeout}).catch(this.handleGatewayError).then(() => {
        process.exit();
      });
    })
  }

  handleGatewayError() {
    console.warn('Could not connect to the gateway ');
    process.exit(0);
  }
}
