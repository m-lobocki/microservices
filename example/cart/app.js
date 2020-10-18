const config = require('./config.json');
const routing = require('./routing');
const microservice = require('../../lib/microservice');

const app = microservice(__dirname, config, routing);
module.exports = app;
