'use strict';

var expect = require('expect.js');
var scrape = require('../../lib/scraper');
var config = require('../fixtures/config');

module.exports = function (done) {
  /* jshint maxstatements: false */

  var errorString = 'this plugin threw an error';

  var scraper = scrape({
    baseUrl: config.host,
    interval: 50,
    maxPending: 10
  });

  scraper.plugin(scrape.plugins.core);
  scraper.plugin(function () {
    throw new Error(errorString);
  });

  scraper.start();

  scraper.on('bug', handleError);
  scraper.on('pluginError', function (err) {
    expect(String(err)).to.be('Error: ' + errorString);
  });

  function handleError(err) {
    scraper.pause();
    done(err);
  }

  scraper.on('end', function (data) {
    expect(data).to.eql(require('../fixtures/data/basic'));
    done();
  });

};

