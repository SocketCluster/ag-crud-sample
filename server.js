const fs = require('fs');
const http = require('http');
const eetase = require('eetase');
const asyngularServer = require('asyngular-server');
const express = require('express');
const serveStatic = require('serve-static');
const path = require('path');
const morgan = require('morgan');
const uuid = require('uuid');
const agcBrokerClient = require('agc-broker-client');

const dummyData = require('./sc_modules/dummy-data');
const authentication = require('./sc_modules/authentication');
const agCrudRethink = require('ag-crud-rethink');

const ENVIRONMENT = process.env.ENV || 'dev';
const ASYNGULAR_PORT = process.env.ASYNGULAR_PORT || 8000;
const ASYNGULAR_WS_ENGINE = process.env.ASYNGULAR_WS_ENGINE || 'ws';
const ASYNGULAR_SOCKET_CHANNEL_LIMIT = Number(process.env.ASYNGULAR_SOCKET_CHANNEL_LIMIT) || 100;
const ASYNGULAR_LOG_LEVEL = process.env.ASYNGULAR_LOG_LEVEL || 2;

const AGC_INSTANCE_ID = uuid.v4();
const AGC_STATE_SERVER_HOST = process.env.AGC_STATE_SERVER_HOST || null;
const AGC_STATE_SERVER_PORT = process.env.AGC_STATE_SERVER_PORT || null;
const AGC_MAPPING_ENGINE = process.env.AGC_MAPPING_ENGINE || null;
const AGC_CLIENT_POOL_SIZE = process.env.AGC_CLIENT_POOL_SIZE || null;
const AGC_AUTH_KEY = process.env.AGC_AUTH_KEY || 'todo';
const AGC_INSTANCE_IP = process.env.AGC_INSTANCE_IP || null;
const AGC_INSTANCE_IP_FAMILY = process.env.AGC_INSTANCE_IP_FAMILY || null;
const AGC_STATE_SERVER_CONNECT_TIMEOUT = Number(process.env.AGC_STATE_SERVER_CONNECT_TIMEOUT) || null;
const AGC_STATE_SERVER_ACK_TIMEOUT = Number(process.env.AGC_STATE_SERVER_ACK_TIMEOUT) || null;
const AGC_STATE_SERVER_RECONNECT_RANDOMNESS = Number(process.env.AGC_STATE_SERVER_RECONNECT_RANDOMNESS) || null;
const AGC_PUB_SUB_BATCH_DURATION = Number(process.env.AGC_PUB_SUB_BATCH_DURATION) || null;
const AGC_BROKER_RETRY_DELAY = Number(process.env.AGC_BROKER_RETRY_DELAY) || null;

let agOptions = {
  pingTimeout: 5000,
  pingInterval: 2000
};

if (process.env.ASYNGULAR_OPTIONS) {
  let envOptions = JSON.parse(process.env.ASYNGULAR_OPTIONS);
  Object.assign(agOptions, envOptions);
}

let httpServer = eetase(http.createServer());
let agServer = asyngularServer.attach(httpServer, agOptions);

let expressApp = express();
if (ENVIRONMENT === 'dev') {
  // Log every HTTP request. See https://github.com/expressjs/morgan for other
  // available formats.
  expressApp.use(morgan('dev'));
}
expressApp.use(serveStatic(path.resolve(__dirname, 'public')));

// Add GET /health-check express route
expressApp.get('/health-check', (req, res) => {
  res.status(200).send('OK');
});

// HTTP request handling loop.
(async () => {
  for await (let requestData of httpServer.listener('request')) {
    expressApp.apply(null, requestData);
  }
})();

// Asyngular/WebSocket connection handling loop.
(async () => {
  for await (let {socket} of agServer.listener('connection')) {
    // Authentication logic.
    authentication.attach(agServer, socket);
  }
})();

let thinky = agCrudRethink.thinky;
let type = thinky.type;

let crudOptions = {
  defaultPageSize: 5,
  schema: {
    Category: {
      fields: {
        id: type.string(),
        name: type.string(),
        desc: type.string().optional()
      },
      views: {
        alphabeticalView: {
          affectingFields: ['name'],
          transform: function (fullTableQuery, r) {
            return fullTableQuery.orderBy(r.asc('name'));
          }
        }
      },
      filters: {
        pre: mustBeLoggedIn
      }
    },
    Product: {
      fields: {
        id: type.string(),
        name: type.string(),
        qty: type.number().integer().optional(),
        price: type.number().optional(),
        desc: type.string().optional(),
        category: type.string()
      },
      views: {
        categoryView: {
          // Declare the fields from the Product model which are required by the transform function.
          paramFields: ['category'],
          affectingFields: ['name'],
          transform: function (fullTableQuery, r, productFields) {
            // Because we declared the category field above, it is available in here.
            // This allows us to tranform/filter the Product collection based on a specific category
            // ID provided by the frontend.
            return fullTableQuery.filter(r.row('category').eq(productFields.category)).orderBy(r.asc('name'));
          }
        },
        lowStockView: {
          // Declare the fields from the Product model which are required by the transform function.
          paramFields: ['category', 'qty'],
          primaryKeys: ['category'],
          transform: function (fullTableQuery, r, productFields) {
            // Because we declared the category field above, it is available in here.
            // This allows us to tranform/filter the Product collection based on a specific category
            // ID provided by the frontend.
            return fullTableQuery.filter(r.row('category').eq(productFields.category)).filter(r.row('qty').le(productFields.qty)).orderBy(r.asc('qty'));
          }
        }
      },
      filters: {
        pre: mustBeLoggedIn,
        post: postFilter
      }
    },
    User: {
      fields: {
        username: type.string(),
        password: type.string()
      },
      filters: {
        pre: mustBeLoggedIn
      }
    }
  },

  thinkyOptions: {
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: process.env.DATABASE_PORT || 28015
  }
};

async function mustBeLoggedIn(req) {
  if (!req.socket.authToken) {
    req.socket.transmit('logout');
    throw true;
  }
}

async function postFilter(req) {
  // The post access control filters have access to the
  // resource object from the DB.
  // In case of read actions, you can even modify the
  // resource's properties before it gets sent back to the user.
}

let crud = agCrudRethink.attach(agServer, crudOptions);

(async () => {
  for await (let {error} of crud.listener('error')) {
    console.error(error);
  }
})();

agServer.thinky = crud.thinky;

// Add some dummy data to our store
dummyData.attach(agServer, crud);

httpServer.listen(ASYNGULAR_PORT);

if (ASYNGULAR_LOG_LEVEL >= 1) {
  (async () => {
    for await (let {error} of agServer.listener('error')) {
      console.error(error);
    }
  })();
}

if (ASYNGULAR_LOG_LEVEL >= 2) {
  console.log(
    `   ${colorText('[Active]', 32)} Asyngular worker with PID ${process.pid} is listening on port ${ASYNGULAR_PORT}`
  );

  (async () => {
    for await (let {warning} of agServer.listener('warning')) {
      console.warn(warning);
    }
  })();
}

function colorText(message, color) {
  if (color) {
    return `\x1b[${color}m${message}\x1b[0m`;
  }
  return message;
}

if (AGC_STATE_SERVER_HOST) {
  // Setup broker client to connect to the Asyngular cluster (AGC).
  let agcClient = agcBrokerClient.attach(agServer.brokerEngine, {
    instanceId: AGC_INSTANCE_ID,
    instancePort: ASYNGULAR_PORT,
    instanceIp: AGC_INSTANCE_IP,
    instanceIpFamily: AGC_INSTANCE_IP_FAMILY,
    pubSubBatchDuration: AGC_PUB_SUB_BATCH_DURATION,
    stateServerHost: AGC_STATE_SERVER_HOST,
    stateServerPort: AGC_STATE_SERVER_PORT,
    mappingEngine: AGC_MAPPING_ENGINE,
    clientPoolSize: AGC_CLIENT_POOL_SIZE,
    authKey: AGC_AUTH_KEY,
    stateServerConnectTimeout: AGC_STATE_SERVER_CONNECT_TIMEOUT,
    stateServerAckTimeout: AGC_STATE_SERVER_ACK_TIMEOUT,
    stateServerReconnectRandomness: AGC_STATE_SERVER_RECONNECT_RANDOMNESS,
    brokerRetryDelay: AGC_BROKER_RETRY_DELAY
  });

  if (ASYNGULAR_LOG_LEVEL >= 1) {
    (async () => {
      for await (let {error} of agcClient.listener('error')) {
        error.name = 'AGCError';
        console.error(error);
      }
    })();
  }
}
