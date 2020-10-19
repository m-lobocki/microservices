const config = require('./config.json');
const routing = require('./routing');
const Gateway = require('../../lib/gateway');

const microservice = new Gateway(__dirname, config, routing);
module.exports = microservice.app;
