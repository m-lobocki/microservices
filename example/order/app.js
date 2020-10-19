const config = require('./config.json');
const routing = require('./routing');
const Microservice = require('../../lib/microservice');

const microservice = new Microservice(__dirname, config, routing);
module.exports = microservice.app;
