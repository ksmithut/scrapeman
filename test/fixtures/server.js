'use strict';

var express = require('express');
var path    = require('path');
var app     = express();
var pubDir  = path.join(__dirname, 'public');
var port    = 8000;

module.exports = function (cb) {
  app.use(function (req, res, next) {
    setTimeout(next, 100);
  });
  app.use(express.static(pubDir));
  app.listen(port, cb);
};
