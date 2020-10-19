const BaseApp = require('./base-app');
const express = require('express');
const axios = require('axios');
const url = require('url');

module.exports = class extends BaseApp {
  buildService(config) {
    const {host, prefix, gateway} = config;
    const serviceUrl = `${host}:${process.env.PORT || '8080'}`; // todo add port to config
    const params = {serviceUrl, prefix};
    const timeout = config.timeout || this.defaultRegistryTimeout;
    const gatewayUrl = url.resolve(gateway, this.registryEndpoint);
    axios.post(gatewayUrl, params, {timeout}).catch(this.handleGatewayError).then(() => {
      console.log(`Dodano ${serviceUrl} do puli ${prefix}`)
    });
    const router = express.Router();
    router.get(this.healthCheckEndpoint, (req, res, next) => {
      res.sendStatus(200);
    });
    this.app.use('/', router)
    process.on('SIGINT', () => {
      axios.delete(gatewayUrl, {params, timeout}).catch(this.handleGatewayError).then(() => {
        console.warn(`Usunięto ${serviceUrl} z puli ${prefix}`);
        process.exit();
      });
    })
  }

  handleGatewayError() {
    console.warn('Nie udało się połączyć z bramką');
    process.exit(0);
  }
}
