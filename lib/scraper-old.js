'use strict';

var path         = require('path');
var EventEmitter = require('events').EventEmitter;
var defaults     = require('lodash.defaults');
var cheerio      = require('cheerio');
var fs           = require('./fs');
var Queue        = require('./queue');
var request      = require('./request');
var readJson     = require('./read-json');

// Scraper
// =======
//
// events:
//   end: (this._pages)
function Scraper(options) {
  if (!(this instanceof Scraper)) { return new Scraper(options); }
  EventEmitter.call(this);

  // Set the default options
  options = options || {};
  if (typeof options === 'string') { options = {url: options}; }
  this._options = defaults(options, {
    url: null,
    maxPending: 3,
    interval: 500,
    checkExternal: true,
    pause: path.join(process.cwd(), 'scraper-pause.json')
  });
  // If a url isn't provided, throw an error
  if (!options.url) {
    throw new Error('You must provide a url option');
  }

  this._queue   = new Queue();
  this._pending = 0;
  this._count   = 0;
  this._started = false;
  this._pages   = {};
  this._plugins = [];

  this._queue.enqueue({
    from: null,
    to: options.url
  });

  return this;
}
require('util').inherits(Scraper, EventEmitter);

// Scraper.add
// -----------
Scraper.prototype.add = function (to, from) {
  this._queue.enqueue({
    to: this.makeAbsolute(to),
    from: this.makeAbsolute(from)
  });
};

// Scraper.crawl
// -------------
Scraper.prototype.crawl = function () {
  this.emit('interval', this);

  var self = this;
  // Go through and add any duplicates without needing to make the request
  var tempItem = this._queue.peek();
  while (tempItem && this._pages[tempItem.to]) {
    tempItem = this._queue.dequeue();
    this._pages[tempItem.to].from.push(tempItem.from);
    tempItem = this._queue.peek();
  }
  // If the pending queue is longer than the allowed length, then wait until
  // the next interval
  if (this._pending >= this._options.maxPending) { return; }
  // If the pending queue and queue queue are empty, then quit
  var queueLength = this._queue.length();
  if (!this._pending && !queueLength) {
    clearInterval(this._interval);
    this.emit('end', this._pages);
    return;
  }
  // If there isn't an item in the queue left, then just wait until the pending
  if (!tempItem) { return; }
  // set the real item
  var item = this._queue.dequeue();
  this._pages[item.to] = {
    from: [item.from],
    url: item.to,
    pending: true
  };
  this._pending++;

  request(item.to)
    .then(function (res) {
      self.processPage(null, item, res);
    })
    .catch(function (err) {
      self.processPage(err, item, {});
    });
};

// Scraper.processPage
// -------------------
Scraper.prototype.processPage = function (err, item, res) {
  var self = this;
  var thisPage = self._pages[item.to];
  var $;

  self._pending--;
  delete thisPage.pending;

  if (err) {
    thisPage.error = err.message;
    return;
  }

  try {
    $ = cheerio.load(res.body);
  } catch (err) {
    thisPage.error = err;
    return;
  }

  this._plugins.map(function (pluginCb) {
    pluginCb.call(self, thisPage, $, res, self._pages);
  });

  this._count++;

  this.emit('pageProcessed', this, thisPage);
};

// Scraper.plugin
Scraper.prototype.plugin = function (pluginCb) {
  this._plugins.push(pluginCb);
  return this;
};

// Scraper.start
// -------------
Scraper.prototype.start = function () {
  if (this._started) { return; }
  this._started = true;
  var self = this;

  return fs.existsAsync(this._options.pause)
    .then(function (exists) {
      if (!exists) { return; }
      return readJson(self._options.pause).then(function (pauseFile) {
        self._queue = new Queue(pauseFile._queue);
        self._count = pauseFile._count;
        self._pages = pauseFile._pages;
        self._images = pauseFile._images;
        return;
      });
    })
    .then(function () {
      var interval = self._options.interval;
      self._interval = setInterval(function () {
        self.crawl.call(self);
      }, interval);
    })
    .catch(function (err) {
      // This should only be a json parsing error.
      throw err;
    });
};

// Scraper.pause
// -------------
Scraper.prototype.pause = function () {
  clearInterval(this.interval);
  var self = this;
  Object.keys(self._pages).map(function (page) {
    if (self._pages[page].pending) { delete self._pages[page]; }
  });
  var pauseFile = {
    _queue: this._queue._queue,
    _count: this._count,
    _pages: this._pages,
    _images: this._images
  };
  var contents = JSON.stringify(pauseFile);
  return fs.writeFileAsync(this._options.pause, contents);
};

// Scraper.isExternal
// ------------------
Scraper.prototype.isExternal = function (url) {
  return url.indexOf('http') === 0 && url.indexOf(this._options.url) !== 0;
};

// Scraper.makeAbsolute
// --------------------
Scraper.prototype.makeAbsolute = function (url) {
  var baseUrl = this._options.url;
  if (url.indexOf('http') === 0) { return url; }
  if (url.indexOf('/') === 0) { return baseUrl + url; }
  return baseUrl + '/' + url;
}

module.exports = Scraper;
