'use strict';

var path         = require('path');
var url          = require('url');
var EventEmitter = require('events').EventEmitter;
var defaults     = require('lodash.defaults');
var assign       = require('lodash.assign');
var Queue        = require('./queue');
var request      = require('./request');

// Scraper
// =======
//
// Scraper is a webscraper "class" that crawls as website in a very methodical
// way by only requesting one resource at a time. It's also built on the idea
// of flexibility and customization. The Scraper class gives you the shell to be
// able to queue up resources to request and request them on an interval, but
// you write plugins to queue up the resources as you wish.
function Scraper(options) {
  if (!(this instanceof Scraper)) { return new Scraper(options); }
  EventEmitter.call(this);

  // Set the default options
  options = defaults(options || {}, {
    baseUrl: null,
    initialPath: '',
    maxPending: 5,
    interval: 500,
    timeout: 15000
  });

  // initialize self properties
  assign(this, {
    _options   : options,
    _queue     : new Queue(),
    _pending   : 0,
    _started   : false,
    _resources : {},
    _plugins   : [],
    _data      : {}
  });

  // Start out the queue with the base url with the initial path
  this.add(options.baseUrl + options.initialPath, null);

  return this;
}
require('util').inherits(Scraper, EventEmitter);

// Scraper.plugins
// ---------------
//
// These are the default plugins that come with Scraper.
Scraper.plugins = {
  status : require('./plugins/status'),
  parse  : require('./plugins/parse'),
  hrefs  : require('./plugins/hrefs'),
  src    : require('./plugins/src')
};
Scraper.plugins.core = [
  Scraper.plugins.status,
  Scraper.plugins.parse,
  Scraper.plugins.hrefs,
  Scraper.plugins.src
];

// Scraper.prototype.fullUrl
// -------------------------
//
// This gets a relative or absolute url and turns it into a fully valid url
// starting with http or https.
//
// ### Parameters
//
// * `url` - The url to get the full url from. Required
// * `from` - The resource from which the url was requested. Must be a full url
// starting with 'http'. Default: the given baseUrl.
//
// ### Returns
//
// * The fully qualified http url
Scraper.prototype.fullUrl = function (uri, from) {
  if (!this._options.baseUrl) { return ''; }
  uri = uri || /* istanbul ignore next: this seems pretty obvious */ '';
  from = from || this._options.baseUrl;
  return url.resolve(from, uri);
};

// Scraper.prototype.isExternal
// ----------------------------
//
// Tells you whether or not the given url is an external link. More of a helper
// method to help plugins determine whether or not they want to actually scrape
// something.
//
// ### Parameters
//
// * `url` - The url to see if it's external to the baseUrl or not.
//
// ### Returns
//
// true/false, true if the url is external to the baseUrl, false if otherwise.
Scraper.prototype.isExternal = function (url) {
  url = this.fullUrl(url);
  return url.indexOf(this._options.baseUrl) !== 0;
};

// Scraper.prototype.plugin
// ------------------------
//
// Adds a plugin or multiple plugins to the plugin chain.
//
// pluginCb.call(self, thisResource, res, self._resources, self._data);
//
// Plugins are functions that get called on every received resource. They get
// called with 4 arguments:
//
// * `thisResource` - The data that is saved to the current resource. This holds
// things like statusCodes, where the resource is linked from, and other such
// things. You can add any data you want to this object and it will stay on it
// until it gets saved. Well, except for any property that starts with '$' or
// '_'. Properties starting with those characters will stay through the plugin
// cycle and will be removed. Everything else, though, stays and will be
// returned in the final object.
// * `res` - This is the http response object returned by the request module.
// * `resources` - This is the resources data with all of the resources that
// exist thus far.
// * `data` - This is any other miscellaneous data that you want to store. This,
// along with the resources, will end up in the final object that gets returned
// from the scraper.
//
// You can also use the `this` reference in a plugin to reference the scraper
// instance. This allows you to call its methods and such.
//
// ### Parameters
//
// * `pluginCb` (Function or Array of Functions) - The plugin to add to the
// plugin chain. If it's an array of plugins, then they will all be added in the
// order that they were in in the array.
Scraper.prototype.plugin = function (pluginCb) {
  var self = this;
  // if the argument is an array, loop through it and register each plugin.
  if (Array.isArray(pluginCb)) {
    pluginCb.map(function (plugin) {
      self.plugin(plugin);
    });
    return self;
  }
  // yes, this actually registers the plugin
  self._plugins.push(pluginCb);
  return self;
};

// Scraper.prototype.add
// ---------------------
//
// Adds a url to scrape to the queue
//
// ### Parameters
//
// * `to` - This is the url (relative or absolute) to the resource to add to the
// queue
// * `from` - The url that the to url was requested from. This url must be a
// fully qualified http url.
Scraper.prototype.add = function (to, from) {
  this._queue.enqueue({
    to: this.fullUrl(to, from),
    from: this.fullUrl(from)
  });
  return this;
};

// Scraper.prototype.pause
// -----------------------
//
// Pauses the scraper and writes to a file to save the state of the crawler
Scraper.prototype.pause = function () {
  var self = this;
  self._started = false;
  clearInterval(self._interval);
  Object.keys(self._resources).map(function (url) {
    /* istanbul ignore else: Difficult to test for for varying response times */
    if (self._resources[url].pending) {
      var resourceData = self._resources[url];
      var lastFrom = resourceData.from.pop();
      self.add(url, lastFrom);
      delete self._resources[url];
    }
  });
  var pauseFile = {
    _queue     : self._queue._queue,
    _resources : self._resources,
    _data      : self._data
  };
  self.emit('pause', pauseFile);
  return pauseFile;
};

// Scraper.prototype.start
// -----------------------
//
// starts (or restarts) the scraping process
Scraper.prototype.start = function (pauseFile) {
  var self = this;
  if (self._started) { return; }
  self._started = true;

  if (pauseFile) {
    assign(self, {
      _queue     : new Queue(pauseFile._queue),
      _resources : pauseFile._resources,
      _data      : pauseFile._data,
      _pending   : 0
    });
  }

  self._interval = setInterval(function () {
    self.crawl.call(self);
  }, self._options.interval);

  return this;
};

// Scraper.prototype.crawl
// -----------------------
//
// Manages the queue and pending requests, and makes the http request to the
// resource
Scraper.prototype.crawl = function () {
  /* jshint maxstatements: 18 */
  var self = this;

  self.emit('interval', this);

  // Remove any duplicates so we don't request the same resource twice
  var tempItem = self._queue.peek();
  while (tempItem && self._resources[tempItem.to]) {
    tempItem = self._queue.dequeue();
    self._resources[tempItem.to].from.push(tempItem.from);
    tempItem = self._queue.peek();
  }
  // if the pending queue is longer than the allowed length, then wait until the
  // next interval
  if (self._pending >= self._options.maxPending) { return; }
  // If the pending queue and queue queue are empty, then quit, we're done
  if (!self._pending && self._queue.isEmpty()) { return self._end(); }
  // If there isn't an item in the queue left, then just wait until the pending
  // items have run out
  if (!tempItem) { return; }

  // set the real item
  var item = self._queue.dequeue();
  self._resources[item.to] = {
    from: [item.from],
    url: item.to,
    pending: true
  };
  self._pending++;
  var possibleInternalError = false;
  // make the request
  request(item.to, self._options.timeout)
    .then(function (res) {
      possibleInternalError = true;
      self._processResource(null, self._resources[item.to], res);
    })
    .catch(function (err) {
      /* istanbul ignore else: We shouldn't be getting errors... */
      if (!possibleInternalError) {
        self._processResource(err, self._resources[item.to], {});
      } else {
        self.emit('bug', err);
      }
    });
};

// Scraper.prototype._processResource
// -----------------------------
//
// Processes the resource data and runs the plugins
Scraper.prototype._processResource = function (err, thisResource, res) {
  /* jshint maxstatements: 13 */
  var self = this;

  // This means that we've been paused and we've added the pending requests to
  // the queue again
  if (!self._started) { return; }

  self._pending--;
  thisResource.pending = false;
  delete thisResource.pending;

  if (err) {
    thisResource.error = err.message;
    self.emit('resourceError', err, self, thisResource);
    return;
  }

  self._plugins.map(function (pluginCb) {
    try {
      pluginCb.call(self, thisResource, res, self._resources, self._data);
    } catch (err) {
      self.emit('pluginError', err, thisResource, res);
    }
  });

  Object.keys(thisResource).map(function (key) {
    if (/^(\$|_)/.test(key)) {
      delete thisResource[key];
    }
  });

  this.emit('resourceProcessed', self, thisResource);
};

// Scraper.prototype._end
// ----------------------
//
// Ends the scraping and writes the final file
Scraper.prototype._end = function () {
  var self = this;
  self._started = false;
  clearInterval(self._interval);
  var pauseFile = {
    resources : self._resources,
    data      : self._data
  };
  self.emit('end', pauseFile);
  return pauseFile;
};

module.exports = Scraper;
