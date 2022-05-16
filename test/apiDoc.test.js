const tap = require('tap');
const joi = require('joi');
const got = require('got');
const hapi = require('hapi');
const inert = require('inert');
const custom = require('./swagger');

tap.test('rpcRoutes', async assert => {
    const utApi = require('..');
    const {rpcRoutes, registerOpenApi, uiRoutes} = await utApi(
        {service: 'test', version: '1.2.3', auth: false}, // config
        {}, // errors
        () => ([{
            issuer: 'ut-login',
            id_token_signing_alg_values_supported: [
                'RS256'
            ],
            code_challenge_methods_supported: [
                'S256'
            ],
            authorization_endpoint: 'http://localhost:8090/rpc/login/form',
            token_endpoint: 'http://localhost:8090/rpc/login/token',
            jwks_uri: 'http://localhost:8090/rpc/login/jwks'
        }]) // issuers
    );
    rpcRoutes([{
        description: 'method with predicate xxx',
        method: 'subject.object.xxx',
        version: '1.2.3',
        validate: {
            payload: joi.object()
        },
        result: joi.object()
    }, {
        description: 'method with predicate yyy',
        method: 'subject.object.yyy',
        version: '1.2.3',
        validate: {
            payload: joi.object()
        },
        result: joi.object()
    }], 'utApi.validations');

    registerOpenApi({custom});

    const server = hapi.server();
    await server.register(inert);
    server.route(uiRoutes);
    await server.start();
    try {
        const modules = await got(`${server.info.uri}/api.json`).json();
        for (const {namespace, swagger, openapi} of modules) {
            if (swagger) {
                const swaggerDoc = await got(`${server.info.uri}/api/${namespace}/swagger.json`).json();
                assert.matchSnapshot(swaggerDoc, `${namespace} namespace swagger document`);
            }
            if (openapi) {
                const openapiDoc = await got(`${server.info.uri}/api/${namespace}/openapi.json`).json();
                assert.matchSnapshot(openapiDoc, `${namespace} namespace openapi document`);
            }
        }
    } finally {
        await server.stop();
    }
});
