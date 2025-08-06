const liveServer = require('live-server');

const params = {
  port: 3000,
  host: '0.0.0.0',
  root: '.',
  open: true,
  ignore: 'node_modules',
  file: 'index.html',
  wait: 1000,
  mount: [],
  logLevel: 2,
  middleware: [
    function(req, res, next) {
      // CORS headers
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      next();
    }
  ]
};

liveServer.start(params);
console.log('🚀 Servidor iniciado em http://localhost:3000');

