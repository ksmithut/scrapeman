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
    var host = 'http://localhost:' + config.port;
    var url = host + '/blog/post1.html';
    var variableResource = data.resources[url];
    delete data.resources[url];
    expect(data).to.eql(require('../fixtures/data/plugin-error'));
    expect(variableResource).to.only.have.keys(['from', 'url', 'statusCode']);
    expect(variableResource.from).to.contain(host + '/blog/');
    expect(variableResource.from).to.contain(host + '/redirect');
    expect(variableResource.url).to.eql(host + '/blog/post1.html');
    expect(variableResource.statusCode).to.eql(200);
    console.log(variableResource);
    done();
  });

};

