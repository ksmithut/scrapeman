'use strict';

var express = require('express');
var path    = require('path');
var http    = require('http');
var app     = express();
var server  = http.createServer(app);
var pubPath = path.join(__dirname, 'site');

app.use(function (req, res, next) {
  setTimeout(next, 100);
});
app.use(express.static(pubPath));

module.exports = server;
