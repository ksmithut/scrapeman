/* global describe, it, before */
'use strict';

var Promise = require('bluebird');
var path    = require('path');
var fs      = require('../lib/fs');
var glob    = Promise.promisify(require('glob'));
var expect  = require('expect.js');
var Scraper = require('../lib/scraper');
var server  = require('./fixtures/server');
var port    = 8000;
var baseUrl = 'http://localhost:' + port;

describe('Scrapeman tests', function () {

  before(function (done) {
    server.listen(port, done);
  });

  describe('Level 1', function () {
    it('should go through all of the pages', defaultOptions);
    it('should pause and save a file', pause);
  });

  describe('Level 2', function () {
    it('should create new Scraper even if the new keyword isn\'t used', noNew);
    it('should handle no options being passed', noOptions);
    it('should handle calling the start twice', startTwice);
    it('should record errors with bad url', badUrl);
  });

  after(function (done) {
    glob('scrapeman-*.json', {cwd: __dirname}).then(function (files) {
      return Promise.all(files.map(function (file) {
        return fs.unlinkAsync(path.join(__dirname, file));
      }));
    }).then(function () {
      server.close();
      done();
    });
  });

});

// defaultOptions
// --------------
function defaultOptions(done) {
  this.timeout(1000000);

  var scraper = new Scraper({
    baseUrl: baseUrl,
    final: path.join(__dirname, 'scrapeman-final.json'),
    interval: 50
  });

  scraper.plugin(Scraper.plugins.status);
  scraper.plugin(Scraper.plugins.parse);
  scraper.plugin(Scraper.plugins.hrefs);
  scraper.plugin(Scraper.plugins.src);

  scraper.start();

  scraper.on('end', function (data) {
    expect(data).to.be.ok();
    expect(data).to.have.key('pages');
    expect(data.pages).to.be.ok();
    expect(data.pages).to.have.keys([
      baseUrl,
      baseUrl + '/',
      baseUrl + '/blog.html',
      baseUrl + '/portfolio.html',
      baseUrl + '/contact.html',
      baseUrl + '/relative-test/',
      baseUrl + '/relative-test/should-not-be-root.html',
      'http://google.com'
    ]);
    done();
  });

}

// pause
// -----
function pause(done) {
  this.timeout(1000000);

  var scraper = new Scraper({
    baseUrl: baseUrl,
    final: path.join(__dirname, 'scrapeman-final1.json'),
    pause: path.join(__dirname, 'scrapeman-pause1.json'),
    interval: 50,
    maxPending: 1
  });

  scraper.plugin(Scraper.plugins.status);
  scraper.plugin(Scraper.plugins.parse);
  scraper.plugin(Scraper.plugins.hrefs);
  scraper.plugin(Scraper.plugins.src);

  scraper.start();

  setTimeout(function () {
    scraper.pause().then(function () {
      scraper.start();
    });
  }, 75);

  scraper.on('end', function (data) {
    expect(data).to.be.ok();
    expect(data).to.have.key('pages');
    expect(data.pages).to.be.ok();
    expect(data.pages).to.have.keys([
      baseUrl,
      baseUrl + '/',
      baseUrl + '/blog.html',
      baseUrl + '/portfolio.html',
      baseUrl + '/contact.html',
      'http://google.com'
    ]);
    done();
  });
}

// noNew
// -----
function noNew() {
  var scraper = Scraper(baseUrl);
}

// noOptions
// ---------
function noOptions() {
  try {
    var scraper = new Scraper();
  } catch (err) {
    expect(err).to.be.an(Error);
    return;
  }
  expect('no error was thrown').to.be(false);
}

// startTwice
// ----------
function startTwice(done) {
  this.timeout(1000000);

  var scraper = new Scraper({
    baseUrl: baseUrl,
    final: path.join(__dirname, 'scrapeman-final2.json'),
    interval: 50
  });

  scraper.plugin(Scraper.plugins.status);
  scraper.plugin(Scraper.plugins.parse);
  scraper.plugin(Scraper.plugins.hrefs);
  scraper.plugin(Scraper.plugins.src);

  scraper.start();
  scraper.start();

  scraper.on('end', function (data) {
    expect(data).to.be.ok();
    expect(data).to.have.key('pages');
    expect(data.pages).to.be.ok();
    expect(data.pages).to.have.keys([
      baseUrl,
      baseUrl + '/',
      baseUrl + '/blog.html',
      baseUrl + '/portfolio.html',
      baseUrl + '/contact.html',
      'http://google.com'
    ]);
    done();
  });
}

// badUrl
// ------
function badUrl(done) {
  this.timeout(1000000);

  var scraper = new Scraper({
    baseUrl: baseUrl + 'a',
    final: path.join(__dirname, 'scrapeman-final3.json'),
    interval: 50
  });

  scraper.plugin(Scraper.plugins.status);
  scraper.plugin(Scraper.plugins.parse);
  scraper.plugin(Scraper.plugins.hrefs);
  scraper.plugin(Scraper.plugins.src);

  scraper.start();

  scraper.on('end', function (data) {
    expect(data).to.be.ok();
    expect(data).to.have.key('pages');
    expect(data.pages).to.be.ok();
    expect(data.pages).to.only.have.key(baseUrl + 'a');
    done();
  });
}
