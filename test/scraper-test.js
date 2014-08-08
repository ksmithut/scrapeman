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
    it('should successfully pause and restart the scraper', require('./level1/pause'));
  });

  describe('Level 2 Tests', function () {
    it('should handle plugin errors', require('./level2/plugin-error'));
    it('should gracefully handle no options', require('./level2/no-options'));
  });

  after(function (done) {
    server.close();
    done();
  });

});
