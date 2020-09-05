const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const axios = require('axios');
const healthCheckEndpoint = require('./health-check-endpoint');
const defaultRegistrationTimeout = 10000;

module.exports = function (dirname, config, routing, extraPluginsFunction) {
  const app = express();
  buildPlugins(app, dirname, extraPluginsFunction)
  buildRouting(app, routing);
  buildService(app, config);
  buildErrorHandlers(app);
  return app;
}

function buildPlugins(app, dirname, extraPluginsFunction) {
  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({extended: false}));
  app.use(cookieParser());
  app.use(express.static(path.join(dirname, 'public')));
  if (extraPluginsFunction instanceof Function) {
    extraPluginsFunction(app)
  }
}

function buildRouting(app, routing) {
  if (routing && typeof routing[Symbol.iterator] === 'function') {
    for (const [endpoint, router] of routing) {
      app.use(endpoint, router);
    }
  }
}

function buildService(app, config) {
  const {host, prefix, gateway} = config;
  const serviceUrl = `${host}:${process.env.PORT || '8080'}`;
  const params = {serviceUrl, prefix};
  const router = express.Router();
  const timeout = config.timeout || defaultRegistrationTimeout;
  axios.post(gateway, params, {timeout}).catch(handleError).then(() => {
    console.log(`Dodano ${serviceUrl} do puli ${prefix}`)
  });
  router.get(healthCheckEndpoint, (req, res, next) => {
    res.sendStatus(200);
  });
  app.use('/', router)
  process.on('SIGINT', () => {
    axios.delete(gateway, {params, timeout}).catch(handleError).then(() => {
      console.warn(`Usunięto ${serviceUrl} z puli ${prefix}`);
    });
  })
}

function buildErrorHandlers(app) {
  app.use(function (req, res, next) {
    next(createError(404)); // todo check czy dziala 404
  });
  app.use(function (err, req, res) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
  });
}

function handleError() {
  console.warn('Nie udało się połączyć z bramką');
  process.exit(0);
}
