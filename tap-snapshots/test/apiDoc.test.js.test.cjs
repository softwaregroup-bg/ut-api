/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/apiDoc.test.js TAP rpcRoutes > custom namespace swagger document 1`] = `
Object {
  "info": Object {
    "description": "Parking services",
    "title": "example",
    "version": "1.0.0",
  },
  "paths": Object {
    "/parking/pay": Object {
      "post": Object {
        "consumes": Array [
          "application/json",
        ],
        "description": "Pay parking in a city zone",
        "operationId": "example.parking.pay",
        "parameters": Array [
          Object {
            "in": "body",
            "name": "body",
            "schema": Object {
              "properties": Object {
                "city": Object {
                  "description": "City",
                  "type": "string",
                },
                "zone": Object {
                  "description": "Zone",
                  "type": "string",
                },
              },
              "required": Array [
                "city",
                "zone",
              ],
              "type": "object",
            },
          },
        ],
        "responses": Object {
          "200": Object {
            "description": "Payment details",
            "schema": Object {
              "properties": Object {
                "details": Object {
                  "properties": Object {
                    "amount": Object {
                      "type": "string",
                    },
                    "time": Object {
                      "type": "string",
                    },
                  },
                  "required": Array [
                    "time",
                    "amount",
                  ],
                  "type": "object",
                },
              },
              "required": Array [
                "details",
              ],
              "type": "object",
            },
          },
        },
        "security": Array [],
        "summary": "Parking payment",
        "tags": Array [
          "parking",
        ],
        "x-options": Object {
          "payload": Object {
            "parse": false,
          },
        },
        "x-ut-errorTransform": "example.error.transform",
        "x-ut-receive": "example.request.receive",
      },
    },
  },
  "security": Array [
    Object {
      "jwt": Array [],
    },
  ],
  "securityDefinitions": Object {
    "basicAuth": Object {
      "type": "basic",
    },
    "jwt": Object {
      "in": "header",
      "name": "authorization",
      "type": "apiKey",
    },
  },
  "swagger": "2.0",
}
`

exports[`test/apiDoc.test.js TAP rpcRoutes > subject namespace openapi document 1`] = `
Object {
  "components": Object {
    "securitySchemes": Object {
      "ut-login": Object {
        "flows": Object {
          "authorizationCode": Object {
            "authorizationUrl": "http://localhost:8090/rpc/login/form",
            "scopes": Object {
              "api": "API",
            },
            "tokenUrl": "http://localhost:8090/rpc/login/token",
          },
        },
        "type": "oauth2",
      },
    },
  },
  "info": Object {
    "description": "UT Microservice API",
    "title": "subject",
    "version": "1.2.3",
  },
  "openapi": "3.0.0",
  "paths": Object {
    "/rpc/subject/object/xxx": Object {
      "post": Object {
        "description": "subject.object.xxx",
        "operationId": "subject.object.xxx",
        "requestBody": Object {
          "content": Object {
            "application/json": Object {
              "schema": Object {
                "additionalProperties": true,
                "properties": Object {},
                "type": "object",
              },
            },
          },
        },
        "responses": Object {
          "200": Object {
            "content": Object {
              "application/json": Object {
                "schema": Object {
                  "additionalProperties": false,
                  "properties": Object {
                    "id": Object {
                      "description": "Unique identifier of the request",
                      "example": "1",
                      "maxLength": 36,
                      "minLength": 1,
                      "type": "string",
                    },
                    "jsonrpc": Object {
                      "description": "Version of the JSON-RPC protocol",
                      "enum": Array [
                        "2.0",
                      ],
                      "example": "2.0",
                      "type": "string",
                    },
                    "method": Object {
                      "description": "Name of the method",
                      "enum": Array [
                        "subject.object.xxx",
                      ],
                      "example": "subject.object.xxx",
                      "type": "string",
                    },
                    "result": Object {
                      "additionalProperties": true,
                      "properties": Object {},
                      "type": "object",
                    },
                  },
                  "required": Array [
                    "jsonrpc",
                    "method",
                  ],
                  "type": "object",
                },
              },
            },
            "description": "Successful response",
          },
          "default": Object {
            "content": Object {},
            "description": "Invalid request",
          },
        },
        "summary": "method with predicate xxx",
        "tags": Array [
          "subject",
        ],
      },
    },
    "/rpc/subject/object/yyy": Object {
      "post": Object {
        "description": "subject.object.yyy",
        "operationId": "subject.object.yyy",
        "requestBody": Object {
          "content": Object {
            "application/json": Object {
              "schema": Object {
                "additionalProperties": true,
                "properties": Object {},
                "type": "object",
              },
            },
          },
        },
        "responses": Object {
          "200": Object {
            "content": Object {
              "application/json": Object {
                "schema": Object {
                  "additionalProperties": false,
                  "properties": Object {
                    "id": Object {
                      "description": "Unique identifier of the request",
                      "example": "1",
                      "maxLength": 36,
                      "minLength": 1,
                      "type": "string",
                    },
                    "jsonrpc": Object {
                      "description": "Version of the JSON-RPC protocol",
                      "enum": Array [
                        "2.0",
                      ],
                      "example": "2.0",
                      "type": "string",
                    },
                    "method": Object {
                      "description": "Name of the method",
                      "enum": Array [
                        "subject.object.yyy",
                      ],
                      "example": "subject.object.yyy",
                      "type": "string",
                    },
                    "result": Object {
                      "additionalProperties": true,
                      "properties": Object {},
                      "type": "object",
                    },
                  },
                  "required": Array [
                    "jsonrpc",
                    "method",
                  ],
                  "type": "object",
                },
              },
            },
            "description": "Successful response",
          },
          "default": Object {
            "content": Object {},
            "description": "Invalid request",
          },
        },
        "summary": "method with predicate yyy",
        "tags": Array [
          "subject",
        ],
      },
    },
  },
  "security": Array [
    Object {
      "ut-login": Array [
        "api",
      ],
    },
  ],
  "tags": Array [
    Object {
      "description": "utApi.validations",
      "name": "subject",
    },
  ],
}
`

exports[`test/apiDoc.test.js TAP rpcRoutes > subject namespace swagger document 1`] = `
Object {
  "info": Object {
    "description": "UT Microservice API",
    "title": "subject",
    "version": "1.2.3",
  },
  "paths": Object {
    "/rpc/subject/object/xxx": Object {
      "post": Object {
        "description": "subject.object.xxx",
        "operationId": "subject.object.xxx",
        "parameters": Array [
          Object {
            "description": "body",
            "in": "body",
            "name": "body",
            "required": true,
            "schema": Object {
              "additionalProperties": true,
              "properties": Object {},
              "type": "object",
            },
          },
        ],
        "produces": Array [
          "application/json",
        ],
        "responses": Object {
          "200": Object {
            "description": "Successful response",
            "schema": Object {
              "additionalProperties": false,
              "properties": Object {
                "id": Object {
                  "description": "Unique identifier of the request",
                  "example": "1",
                  "maxLength": 36,
                  "minLength": 1,
                  "type": "string",
                },
                "jsonrpc": Object {
                  "description": "Version of the JSON-RPC protocol",
                  "enum": Array [
                    "2.0",
                  ],
                  "example": "2.0",
                  "type": "string",
                },
                "method": Object {
                  "description": "Name of the method",
                  "enum": Array [
                    "subject.object.xxx",
                  ],
                  "example": "subject.object.xxx",
                  "type": "string",
                },
                "result": Object {
                  "additionalProperties": true,
                  "properties": Object {},
                  "type": "object",
                },
              },
              "required": Array [
                "jsonrpc",
                "method",
              ],
              "type": "object",
            },
          },
          "default": Object {
            "description": "Invalid request",
            "schema": Object {},
          },
        },
        "summary": "method with predicate xxx",
        "tags": Array [
          "subject",
        ],
      },
    },
    "/rpc/subject/object/yyy": Object {
      "post": Object {
        "description": "subject.object.yyy",
        "operationId": "subject.object.yyy",
        "parameters": Array [
          Object {
            "description": "body",
            "in": "body",
            "name": "body",
            "required": true,
            "schema": Object {
              "additionalProperties": true,
              "properties": Object {},
              "type": "object",
            },
          },
        ],
        "produces": Array [
          "application/json",
        ],
        "responses": Object {
          "200": Object {
            "description": "Successful response",
            "schema": Object {
              "additionalProperties": false,
              "properties": Object {
                "id": Object {
                  "description": "Unique identifier of the request",
                  "example": "1",
                  "maxLength": 36,
                  "minLength": 1,
                  "type": "string",
                },
                "jsonrpc": Object {
                  "description": "Version of the JSON-RPC protocol",
                  "enum": Array [
                    "2.0",
                  ],
                  "example": "2.0",
                  "type": "string",
                },
                "method": Object {
                  "description": "Name of the method",
                  "enum": Array [
                    "subject.object.yyy",
                  ],
                  "example": "subject.object.yyy",
                  "type": "string",
                },
                "result": Object {
                  "additionalProperties": true,
                  "properties": Object {},
                  "type": "object",
                },
              },
              "required": Array [
                "jsonrpc",
                "method",
              ],
              "type": "object",
            },
          },
          "default": Object {
            "description": "Invalid request",
            "schema": Object {},
          },
        },
        "summary": "method with predicate yyy",
        "tags": Array [
          "subject",
        ],
      },
    },
  },
  "security": Array [
    Object {
      "ut-login": Array [
        "api",
      ],
    },
  ],
  "securityDefinitions": Object {
    "ut-login": Object {
      "authorizationUrl": "http://localhost:8090/rpc/login/form",
      "flow": "accessCode",
      "scopes": Object {
        "api": "API",
      },
      "tokenUrl": "http://localhost:8090/rpc/login/token",
      "type": "oauth2",
    },
  },
  "swagger": "2.0",
  "tags": Array [
    Object {
      "description": "utApi.validations",
      "name": "subject",
    },
  ],
}
`
