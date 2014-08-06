'use strict';

var express = require('express');
var http    = require('http');
var path    = require('path');
var app     = express();
var server  = http.createServer(app);
var pubDir  = path.join(__dirname, 'public');

app.use(function (req, res, next) {
  setTimeout(next, 100);
});
app.use(express.static(pubDir));

module.exports = http.createServer(app);
