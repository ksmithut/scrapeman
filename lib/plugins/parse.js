'use strict';

var cheerio = require('cheerio');

function parse(thisResource, res) {
  /* jshint maxstatements: false */
  if (thisResource.statusCode && !thisResource._successful) { return; }
  var isHtml = false;
  /* istanbul ignore else: difficult to get bad response from request */
  if (res && res.headers && res.headers['content-type']) {
    var contentType = res.headers['content-type'];
    isHtml = contentType.indexOf('text/html') !== -1;
  }
  if (!isHtml) { return; }
  try {
    thisResource.$ = cheerio.load(res.body);
  } catch (err) {
    /* istanbul ignore next: cheerio has a very forgiving html parser */
    (function () {
      thisResource.$ = false;
      delete thisResource.$;
      thisResource.error = err.message;
      return;
    })();
  }
}

module.exports = parse;
