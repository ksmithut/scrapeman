'use strict';

var path         = require('path');
var EventEmitter = require('events').EventEmitter;
var defaults     = require('lodash.defaults');
var fs           = require('./fs');
var Queue        = require('./queue');
var request      = require('./request');

function Scraper(options) {
  /* jshint maxstatements: false */
  if (!(this instanceof Scraper)) { return new Scraper(options); }
  EventEmitter.call(this);

  // Set the default options
  options = options || {};
  if (typeof options === 'string') { options = {baseUrl: options}; }
  this._options = defaults(options, {
    baseUrl: null,
    initialPath: '',
    maxPending: 5,
    interval: 500,
    pause: path.join(process.cwd(), 'scrapeman-pause.json'),
    final: path.join(process.cwd(), 'scrapeman-final.json')
  });
  // If a url isn't provided, throw an error
  if (!options.baseUrl) {
    throw new Error('scrapeman: You must provide a baseUrl option');
  }

  // initialize self properties
  this._queue   = new Queue();
  this._pending = 0;
  this._started = false;
  this._pages   = {};
  this._plugins = [];
  this._data    = {};

  // Start out the queue with the base url with the initial path
  this._queue.enqueue({
    from: null,
    to: options.baseUrl + options.initialPath
  });

  return this;
}
require('util').inherits(Scraper, EventEmitter);

var scraper = Scraper.prototype;

// Scraper.prototype.fullUrl
// -------------------------
//
// This gets a relative or absolute url and turns it into a fully valid url
// starting with http or https.
scraper.fullUrl = function (url) {
  url = url || '';
  var baseUrl = this._options.baseUrl;
  if (url.indexOf('http') === 0) { return url; }
  if (url.indexOf('/') === 0) { return baseUrl + url; }
  return baseUrl + '/' + url;
};

// Scraper.prototype.isExternal
// ----------------------------
//
// Tells you whether or not the given url is an external link. More of a helper
// method to help plugins determine whether or not they want to actually scrape
// something.
scraper.isExternal = function (url) {
  var baseUrl = this._options.baseUrl;
  url = this.fullUrl(url);
  return url.indexOf(baseUrl) !== 0;
};

// Scraper.prototype.plugin
// ------------------------
//
// Adds a plugin to the plugin chain
scraper.plugin = function (pluginCb) {
  this._plugins.push(pluginCb);
  return this;
};

// Scraper.prototype.add
// ---------------------
//
// Adds a url to scrape to the queue
scraper.add = function (to, from) {
  this._queue.enqueue({
    to: this.fullUrl(to),
    from: this.fullUrl(from)
  });
};

// Scraper.prototype.pause
// -----------------------
//
// Pauses the scraper and writes to a file to save the state of the crawler
scraper.pause = function () {
  var self = this;
  self._started = false;
  clearInterval(self._interval);
  Object.keys(self._pages).map(function (page) {
    /* istanbul ignore else: This requires requests to take too long */
    if (self._pages[page].pending) {
      var pageData = self._pages[page];
      var lastFrom = pageData.from.pop();
      self.add(page, lastFrom);
      delete self._pages[page];
    }
  });
  var pauseFile = {
    _queue : this._queue._queue,
    _pages : this._pages,
    _data  : this._data
  };
  var stringContents = JSON.stringify(pauseFile);
  return fs.writeFileAsync(this._options.pause, stringContents);
};

// Scraper.prototype.start
// -----------------------
//
// starts (or restarts) the scraping process
scraper.start = function () {
  var self = this;
  if (self._started) { return; }
  var pauseFilename = self._options.pause;
  self._started = true;

  return fs.existsAsync(pauseFilename)
    .then(function (exists) {
      if (!exists) { return; }
      return fs.readJson(pauseFilename).then(function (pauseFile) {
        self._queue = new Queue(pauseFile._queue);
        self._pages = pauseFile._pages;
        self._data  = pauseFile._data;
      });
    })
    .then(function () {
      self._interval = setInterval(function () {
        self.crawl.call(self);
      }, self._options.interval);
    });
};

// Scraper.prototype.crawl
// -----------------------
//
// Manages the queue and pending requests, and makes the http request to the
// resource
scraper.crawl = function () {
  /* jshint maxstatements: false */
  var self = this;

  self.emit('interval', this);

  // Remove any duplicates so we don't request the same resource twice
  var tempItem = self._queue.peek();
  while (tempItem && self._pages[tempItem.to]) {
    tempItem = self._queue.dequeue();
    self._pages[tempItem.to].from.push(tempItem.from);
    tempItem = self._queue.peek();
  }
  // if the pending queue is longer than the allowed length, then wait until the
  // next interval
  if (self._pending > self._options.maxPending) { return; }
  // If the pending queue and queue queue are empty, then quit, we're done
  if (!self._pending && self._queue.isEmpty()) { return self._end(); }
  // If there isn't an item in the queue left, then just wait until the pending
  // items have run out
  if (!tempItem) { return; }
  // set the real item
  var item = self._queue.dequeue();
  self._pages[item.to] = {
    from: [item.from],
    url: item.to,
    pending: true
  };
  self._pending++;
  var possibleInternalError = false;
  // make the request
  request(item.to)
    .then(function (res) {
      possibleInternalError = true;
      self.processPage(null, self._pages[item.to], res);
    })
    .catch(function (err) {
      /* istanbul ignore else: We shouldn't be getting errors */
      if (!possibleInternalError) {
        self.processPage(err, self._pages[item.to], {});
      } else {
        self.emit('bug', err);
      }
    });
};

// Scraper.prototype.processPage
scraper.processPage = function (err, thisPage, res) {
  /* jshint maxstatements: false */
  var self = this;

  self._pending--;
  thisPage.pending = false;
  delete thisPage.pending;

  if (err) {
    thisPage.error = err.message;
    self.emit('pageError', err, self, thisPage);
    return;
  }

  this._plugins.map(function (pluginCb) {
    pluginCb.call(self, thisPage, res, self._pages);
  });

  Object.keys(thisPage).map(function (key) {
    if (/^(\$|_)/.test(key)) {
      delete thisPage[key];
    }
  });

  this.emit('pageProcessed', self, thisPage);
};

// Scraper.prototype._end
// ----------------------
//
// Ends the scraping and writes the final file
scraper._end = function () {
  var self = this;
  clearInterval(self._interval);
  var pauseFile = {
    pages : self._pages,
    data  : self._data
  };
  var stringContents = JSON.stringify(pauseFile);
  return fs.writeFileAsync(self._options.final, stringContents)
    .then(function () { self.emit('end', pauseFile); });
};

// Plugins
// -------
Scraper.plugins = {
  parse  : require('./plugins/parse'),
  hrefs  : require('./plugins/hrefs'),
  src    : require('./plugins/src'),
  status : require('./plugins/status')
};

module.exports = Scraper;
