'use strict';

var Promise = require('bluebird');
var request = require('request');


module.exports = function (url) {
  return new Promise(function (resolve, reject) {
    request({
      url: url,
      method: 'GET',
      maxRedirects: 10,
      pool: {
        maxSockets: 10
      },
      timeout: 5000
    }, function (error, response) {
      if (error) { return reject(error); }
      resolve(response);
    });
  });
};
