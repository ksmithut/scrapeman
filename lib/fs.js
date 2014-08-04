'use strict';

// fs
// ===
//
// This whole file exists so that we can make a promisified version of fs. The
// only reason we split it into a different file is so we can correctly use the
// `exists` method in a promisified version without breaking anything

var Promise = require('bluebird');
var fs      = Promise.promisifyAll(require('fs'));

// fs.existsAsync
// --------------
//
// A promisified version of `fs.exists`. The bluebird `Promise.promisify` method
// works for most async callback functions because most of them have an `err`
// argument as the first argument, but `fs.exists` only returns a boolean as the
// only argument. So if the file exists, it would cause the Promise chain to go
// into 'catch' mode.
fs.existsAsync = function (filepath) {
  return new Promise(function (resolve) {
    fs.exists(filepath, resolve);
  });
};

// fs.readJson
// -----------
//
// Reads a json file and parses it, all in a promised based version
fs.readJson = function (path) {
  return fs.readFileAsync(path).then(JSON.parse);
};

module.exports = fs;
