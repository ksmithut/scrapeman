'use strict';

var expect = require('expect.js');
var scrape = require('../../lib/scraper');
var config = require('../fixtures/config');

module.exports = function (done) {

  var scraper = scrape({
    baseUrl: config.host,
    interval: 10,
    maxPending: 1
  });

  scraper.plugin(scrape.plugins.core);

  scraper.start();
  scraper.start();

  scraper.on('bug', handleError);
  scraper.on('pluginError', handleError);

  function handleError(err) {
    scraper.pause();
    done(err);
  }

  scraper.on('end', function (data) {
    expect(data).to.eql(require('../fixtures/data/basic'));
    done();
  });

};
