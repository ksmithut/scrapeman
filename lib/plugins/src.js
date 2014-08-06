'use strict';

function src(curPage) {
  /* jshint validthis: true */
  var self = this;
  if (!curPage.$) { return; }
  if (self.isExternal(curPage.url)) { return; }

  var $ = curPage.$;
  var images = $('img');

  images.each(function () {
    var src = $(this).attr('src');
    if (validSrc(src)) {
      self.add(src, curPage.url);
    }
  });
}

function validSrc(src) {
  if (!src) { return false; }
  if (/^(data:)/.test(src)) { return false; }
  return true;
}

module.exports = src;
