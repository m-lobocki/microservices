const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

module.exports = class {
  constructor(dirname, config, routing, extraPluginsFunction) {
    this.app = express();
    this.healthCheckEndpoint = '/health';
    this.registryEndpoint = '/registry';
    this.defaultRegistryTimeout = 10000;
    this.buildPlugins(dirname, extraPluginsFunction)
    this.buildRouting(routing);
    this.buildService(config || {});
    this.buildErrorHandlers();
  }

  buildPlugins(dirname, extraPluginsFunction) {
    this.app.use(logger('dev'));
    this.app.use(express.json());
    this.app.use(express.urlencoded({extended: false}));
    this.app.use(cookieParser());
    this.app.use(express.static(path.join(dirname, 'public')));
    if (extraPluginsFunction instanceof Function) {
      extraPluginsFunction(this.app)
    }
  }

  buildRouting(routing) {
    if (routing && typeof routing[Symbol.iterator] === 'function') {
      for (const [endpoint, router] of routing) {
        this.app.use(endpoint, router);
      }
    }
  }

  buildErrorHandlers() {
    this.app.use((req, res, next) => {
      this.handleHttpError(res, 404);
    });
    this.app.use((err, req, res) => {
      res.locals.message = err.message;
      res.locals.error = req.app.get('env') === 'development' ? err : {};
      res.status(err.status || 500);
    });
  }

  handleHttpError(res, code) {
    res.status(code);
    res.end();
  }
}