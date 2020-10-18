# Description
A simple microservice framework written in JavaScript designed for node.js apps.

# Microservice
Import `microservice.js`:

`const microservice = require('lib/microservice');`

It is a function that builds a microservice on top of an Express.js application. Pass `__dirname`, custom `config` and
`routing`. Routing is made in form of an array of routes, where a route is  an endpoint, and `express.Router`.

Example of routing:
````
module.exports = [
  ['/', indexRouter],
  ['/help', helpRouter]
];
````

`const app = microservice(__dirname, config, routing);`

## Config
Create a json file, e.g. `config.json` and pass it to a microservice.
### Options
##### Required
* gateway
* host
* prefix
##### Optional
* timeout

# Gateway
The library is based on the microservice with a gateway pattern. Learn more at https://microservices.io/patterns/apigateway.html

Import `microservice.js`:

`const gateway = require('lib/gateway');`

# Running
To run an instance of a microservice open the terminal and set desired port (example for Windows: `set PORT=8081`), then run `npm run start`
