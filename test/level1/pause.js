'use strict';

var expect  = require('expect.js');
var Scraper = require('../../lib/scraper');
var config  = require('../fixtures/config');

module.exports = function (done) {

  var scraper = new Scraper({
    baseUrl: config.host,
    interval: 100,
    maxPending: 10
  });

  scraper.plugin(Scraper.plugins.core);

  scraper.start();

  setTimeout(function () {
    var pauseFile = scraper.pause();
    setTimeout(function () {
      scraper.start(pauseFile);
    }, 100);
  }, 110);

  scraper.on('bug', handleError);
  scraper.on('pluginError', handleError);

  function handleError(err) {
    scraper.pause();
    done(err);
  }

  scraper.on('end', function (data) {
    try {
      expect(data).to.eql(require('../fixtures/data/basic'));
    } catch (err) {
      try {
        expect(data).to.eql(require('../fixtures/data/new-basic'));
      } catch (err) {
        expect(data).to.eql(require('../fixtures/data/new2-basic'));
      }
    }
    done();
  });

};
