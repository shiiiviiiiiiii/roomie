// Netlify Function: runs the Roomie Express API via serverless-http.
// Netlify rewrites /api/* to /.netlify/functions/api/:splat (see netlify.toml).
const serverless = require('serverless-http');
const express = require('express');
const roomieApp = require('../../server/src/index');

const app = express();

// Normalise the path: depending on how the platform invokes the function,
// the URL may arrive as /api/listings (original request path) or with the
// /.netlify/functions/api prefix still attached. Either way, the Roomie
// Express app below expects paths under /api/*.
app.use((req, _res, next) => {
  const prefix = '/.netlify/functions/api';
  let url = req.url || '/';
  if (url.startsWith(prefix)) url = url.slice(prefix.length) || '/';
  const qIndex = url.indexOf('?');
  const pathOnly = qIndex === -1 ? url : url.slice(0, qIndex);
  const query = qIndex === -1 ? '' : url.slice(qIndex);
  if (pathOnly !== '/api' && !pathOnly.startsWith('/api/')) {
    url = '/api' + (pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`) + query;
  }
  req.url = url;
  next();
});

app.use(roomieApp);

module.exports.handler = serverless(app);
