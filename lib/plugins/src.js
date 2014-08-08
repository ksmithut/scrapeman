'use strict';

function src(thisResource) {
  /* jshint validthis: true */
  var self = this;
  if (!thisResource.$ || self.isExternal(thisResource.url)) { return; }

  var $ = thisResource.$;
  var images = $('img');

  images.each(function () {
    var src = $(this).attr('src');
    if (validSrc(src)) {
      self.add(src, thisResource.url);
    }
  });
}

function validSrc(src) {
  if (!src) { return false; }
  if (/^(data:)/.test(src)) { return false; }
  return true;
}

module.exports = src;
