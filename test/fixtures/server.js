'use strict';

var express = require('express');
var path    = require('path');
var http    = require('http');
var app     = express();
var server  = http.createServer(app);
var pubPath = path.join(__dirname, 'site');

app.use(express.static(pubPath));

module.exports = server;
