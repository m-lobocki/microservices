const createError = require('http-errors');
const axios = require('axios');
const registryEndpoint = '/registry';
const healthCheckEndpoint = '/health'

const registry = new Map();
let registryLoadBalanceIndex = 0;
const registrationTimeout = 10000;
const healthCheckTimeout = 10000;
const healthCheckFrequency = 60000;

function modifyRegistry(req, res, paramsSource, modificationFunction) {
    const {serviceUrl, prefix} = paramsSource;
    if (!serviceUrl || !prefix) {
        throw new Error('Nie podano parametrów');
    }
    let endpointServices = registry.get(prefix) || [];
    endpointServices = modificationFunction(endpointServices, serviceUrl);
    registry.set(prefix, endpointServices);
    res.sendStatus(200);
}

function handleError() {
    console.warn('Nie udało się połączyć z bramką');
    process.exit(0);
}

function healthCheck() {
    console.log('Badanie mikroserwisów');
    for (const [prefix, serviceUrls] of registry) {
        for (const serviceUrl of serviceUrls) {
            axios.get(serviceUrl + healthCheckEndpoint, {timeout: healthCheckTimeout}).catch(() => {
                const endpointServices = (registry.get(prefix) || []).filter(url => url !== serviceUrl);
                registry.set(prefix, endpointServices);
                console.warn(`Usunięto ${serviceUrl} z puli ${prefix}`);
            });
        }
    }
}

function tryRouteToMicroservice(req, res, next) {
    const url = req.url || '';
    const urlParts = url.split('/');
    if (urlParts.length >= 1) {
        const prefix = '/' + urlParts[1];
        const microserviceUrls = registry.get(prefix);
        let microserviceUrl = null;
        if (microserviceUrls) {
            if (registryLoadBalanceIndex >= microserviceUrls.length) {
                registryLoadBalanceIndex = 0;
            }
            microserviceUrl = microserviceUrls[registryLoadBalanceIndex];
            registryLoadBalanceIndex++;
        }
        if (microserviceUrl) {
            const restUrl = url.replace(prefix, '');
            const requestUrl = microserviceUrl + restUrl;
            axios.request({method: req.method, timeout: registrationTimeout, url: requestUrl, params: req.params, data: req.body})
                .then((microserviceResponse) => {
                    console.log(`Przekierowano rządanie ${url} do ${requestUrl}`);
                    res.send(microserviceResponse.data);
                    res.end();
                })
                .catch((e) => {
                    next(createError(404));
                    res.end();
                });
        } else {
            next(createError(404));
            res.end();
        }
    }
}

module.exports = {
    registerService(config, app, router) {
        const {host, prefix, gateway} = config;
        const serviceUrl = `${host}:${process.env.PORT || '8080'}`;
        const gatewayUrl = gateway + registryEndpoint;
        const params = {serviceUrl, prefix};
        axios.post(gatewayUrl, params, {timeout: registrationTimeout}).catch(handleError).then(() => {
            console.log(`Dodano ${serviceUrl} do puli ${prefix}`)
        });
        router.get(healthCheckEndpoint, (req, res, next) => {
            res.sendStatus(200);
            next();
        });
        app.use('/', router)
        process.on('SIGINT', () => {
            axios.delete(gatewayUrl, {params, timeout: registrationTimeout}).catch(handleError).then(() => {
                console.warn(`Usunięto ${serviceUrl} z puli ${prefix}`);
            });
        })
    },

    registerGateway(app, router) {
        router.get('/', (req, res, next) => {
            res.send([...registry]);
            next();
        });
        router.post('/', (req, res, next) => {
            modifyRegistry(req, res, req.body, (services, serviceUrl) =>
                [...services, serviceUrl]);
            next();
        });
        router.delete('/', (req, res, next) => {
            modifyRegistry(req, res, req.query, (services, serviceUrl) =>
                services.filter(url => url !== serviceUrl));
            next();
        });
        app.use(registryEndpoint, router);
        app.use(function (req, res, next) {
            if (!req.route) {
                tryRouteToMicroservice(req, res, next);
            }
        });
        setInterval(healthCheck, healthCheckFrequency);
    },
};