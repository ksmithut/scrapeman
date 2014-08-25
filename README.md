# scrapeman

[![NPM version](http://img.shields.io/npm/v/scrapeman.svg?style=flat)](https://www.npmjs.org/package/scrapeman)
[![Dependency Status](http://img.shields.io/gemnasium/ksmithut/scrapeman.svg?style=flat)](https://gemnasium.com/ksmithut/scrapeman)
[![Code Climate](http://img.shields.io/codeclimate/github/ksmithut/scrapeman.svg?style=flat)](https://codeclimate.com/github/ksmithut/scrapeman)
[![Build Status](http://img.shields.io/travis/ksmithut/scrapeman.svg?style=flat)](https://travis-ci.org/ksmithut/scrapeman)
[![Coverage Status](http://img.shields.io/codeclimate/coverage/github/ksmithut/scrapeman.svg?style=flat)](https://codeclimate.com/github/ksmithut/scrapeman)

A node module to help build custom web scrapers

# Installation

```bash
npm install --save scrapeman
```

# Basic Usage

Below is a code example of the basic usage of the scraper. This will crawl this
website following any `<a>` tag and `<img>` tag and give you information on each
page such as the status code andwhich pages each page (or image) was linked
from. Once it's done, it will write to a file called `scrapeman-final.json` with
all of the data.

```javascript
var Scraper = require('scrapeman');

var scraper = new Scraper({baseUrl: 'http://yoursite.com'});

scraper.plugin(Scraper.plugins.core);

scraper.start();

scraper.on('end', function (data) {
  console.log('scraping finished!');
});
```

# API

`new Scraper(options)`

Returns a new instance of a scraper with the given options.

* `options.baseUrl` The baseUrl (or host) to scrape from. This is prepended to
any relative or absolute resource paths. This is required.

* `options.initialPath` The relative url to start at when scraping. Default:
`''`

* `options.maxPending` The maximum number of pending requests before it will
stop making requests. Once the pending number goes down, it will continue to
make requests at the given interval. Default: `5`

* `options.interval` The interval (in milliseconds) by which the scraper will
make requests. Default: `500`

---

`scraper.fullUrl(url)`

Turns a relative or absolute url into the full blown
`http` starting url. If it already starts with http, then it just returns what
you give it.

---

`scraper.isExternal(url)`

Tells you if a url is an external url, meaning that it doesn't belong to the
same domain.

---

`scraper.add(to, from)`

Adds a url to scrape to the queue.

---

`scraper.plugin(plugin)`

Adds a plugin to the plugin chain. You can also pass an array of plugins to add.
There are several plugins built it to help you get started.

* `Scraper.plugins.status` Attaches the status code to the page data.
* `Scraper.plugins.parse` Parses html resources and attaches a $ object to the
page data. In subsequent plugins, you may use this to select elements as you
would with jQuery
* `Scraper.plugins.hrefs` Uses the $ object to find all of the `<a/>` tags and
adds the url from the `href` attribute to the scraper queue
* `Scraper.plugins.src` Uses the $ object to find all of the `<img/>` tags and
adds the url from the `src` attribute to the scraper queue

If you want to use all of those (in that order), you can use
`scraper.plugin(Scraper.plugins.core)`.

You can add your own plugin! A plugin is just a function that accepts 4
arguments: `curPage` (the current page that just got scraped), `res` (the http
response data), `pages` (the current list of all of the pages and their data),
and `data` (which is used to store any other kind of information not directly
relating to the list of pages). The `this` reference refers to the scraper, so
you have access to all of the methods used to add pages to the queue, access the
queue itself, pause the scraper, and all that fun stuff.

Below is the code for the hrefs plugin:

```javascript
function hrefs(curPage) {
  var self = this;
  var $    = curPage.$;
  if (!$) { return; }
  if (self.isExternal(curPage.url)) { return; }

  $('a').each(function () {
    var href = $(this).attr('href');
    if (validHref(href)) {
      self.add(href, curPage.url);
    }
  });
}

function validHref(href) {
  if (!href) { return false; }
  if (/^(tel:|mailto:|javascript:|#)/.test(href)) { return false; }
  return true;
}

module.exports = hrefs;
```

Pretty simple, right? This plugin based approach give you the ability to make
the scraper do what you want it to do. Want to scrape the meta tags? You could
likely use most of the code above to do it. Want to keep track of all of the img
titles and alt text? You can do that do. Want it to only scrape through a series
of pages? Just modify the above code to only add the links that point to the
next page.

To check for plugin errors, listen on the pluginError event:

```javascript
scraper.on('pluginError', function (err) {
  console.error(err);
});
```

Errors will not break the scraper, it will just ignore anything that happens in
it after the error is thrown.
---

`scraper.start()`

Starts (or restarts) the scraper. Don't worry about accidentally starting it
twice, if you do, it will just ignore any subsequent calls.

---

`scraper.pause()`

Pauses the scraper and gives you pause data that you can save to a file or whatever. Historically,
this plugin saved the file for you, but doing that made assumptions about your workflow.
If you would like to save stuff to a file and restart based on the saved file, you could
do something like this:

```javascript
// ... initialize your scraper stuff here
var fs   = require('fs');
var path = require('path');
var saveFile = path.join(process.cwd(), 'scrapeman-pause.json');

fs.exists(saveFile, function (exists) {
  var saveData;
  if (exists) { saveData = require(saveFile); }
  scraper.start(saveData);
});

process.on('SIGINT', function () {
  var saveData = scraper.pause();
  var stringContents = JSON.stringify(saveData, null, 2);
  fs.writeFile(saveFile, stringContents, function (err) {
    if (err) { return console.error(err); }
    console.log('scraper paused');
  });
});
```
I may be convinced to write in some file saver api, but I'd like to keep that
part out of this module.

---

I know that's a lot to take in, but let me know if I can help make anything more
clear by opening an issue.

Also, it's not perfect. There are a lot of errors to try and account for. If you
are running into issues, open an issue and I'll get to it as soon as possible,
usually within a day.
