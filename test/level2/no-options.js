'use strict';

var expect = require('expect.js');
var Scraper = require('../../lib/scraper');
var config = require('../fixtures/config');

module.exports = function (done) {

  var scraper = new Scraper();

  scraper.plugin(Scraper.plugins.core);

  scraper.start();

  scraper.on('bug', handleError);
  scraper.on('pluginError', handleError);

  function handleError(err) {
    scraper.pause();
    done(err);
  }

  scraper.on('end', function (data) {
    expect(data).to.eql(require('../fixtures/data/no-options'));
    done();
  });

};

