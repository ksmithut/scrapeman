/* global describe, it, before, after */
/* jshint maxlen: false */
'use strict';

var path   = require('path');
var server = require('./fixtures/server');
var config = require('./fixtures/config');

describe('', function () {
  this.timeout(1000000);

  before(function (done) {
    server.listen(config.port, done);
  });

  describe('Level 1', function () {
    it('should scrape the entire link reachable website', require('./level1/default-options'));
  });

  // describe('Level 2 Tests', function () {
  //
  // });

  after(function (done) {
    server.close();
    done();
  });

});
