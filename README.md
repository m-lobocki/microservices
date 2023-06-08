# Description
A simple microservice framework written in JavaScript designed for node.js apps. Since the framework is based on
express.js, each application must contain `app.js` which is the entry point.

The architecture is based on the microservice with a gateway pattern. Learn more at
https://microservices.io/patterns/apigateway.html

# Constructor
Both `Microservice` and `Gateway` classes are a facade that builds an app on top of the express.js and require the same
set of arguments. The config however has different options.

Create an instance of a facade (either [Microservice](#Microservice) or [Gateway](#Gateway))
in the `app.js` file and export it's `app` property.

Constructor accepts the following arguments:
* __dirname - current working directory required by express.js to serve static files
* config - custom config object, check [Microservice](#Microservice) or [Gateway](#Gateway) sections for details
* routing - in form of an array of routes, where a route is  an endpoint, and `express.Router`. Example routing
configuration:
    ````
    module.exports = [
      ['/', indexRouter],
      ['/help', helpRouter]
    ];
    ````

You can still access the original express app through the `app` property included in the facade class.

# Microservice
Creating microservice facade:

````
const microservice = new Microservice(__dirname, config, routing);
module.exports = microservice.app;
````

### Config
##### Required
* gateway - full gateway URL
* host
* prefix
##### Optional
* timeout

# Gateway
Creating gateway facade:

````
const gateway = new Gateway(__dirname, config, routing);
module.exports = gateway.app;
````

### Config
##### Required
##### Optional
* healthCheckFrequency - frequency (milliseconds) of sending health checks, default 60000
* healthCheckTimeout - time (milliseconds) to wait before assuming service is broken, default 10000

# Running
To run an instance of a microservice open the terminal and set desired port (example for Windows: `set PORT=8081`), then run `npm run start`
