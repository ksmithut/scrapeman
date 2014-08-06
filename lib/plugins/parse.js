'use strict';

var cheerio = require('cheerio');

function parse(curPage, res, pages) {
  /* jshint maxstatements: false */
  if (curPage.statusCode && !curPage._successful) { return; }
  var isHtml = false;
  if (res && res.headers && res.headers['content-type']) {
    var contentType = res.headers['content-type'];
    isHtml = contentType.indexOf('text/html') !== -1;
  }
  if (!isHtml) { return; }
  try {
    curPage.$ = cheerio.load(res.body);
  } catch (err) {
    curPage.$ = false;
    delete curPage.$;
    curPage.error = err.message;
    return;
  }
}

module.exports = parse;
