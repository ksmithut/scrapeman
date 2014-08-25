'use strict';

function hrefs(thisResource) {
  /* jshint validthis: true */
  var self = this;
  var $    = thisResource.$;
  if (!$) { return; }
  if (self.isExternal(thisResource.url)) { return; }

  $('a').each(function () {
    var href = $(this).attr('href');
    if (validHref(href)) {
      href.replace(/#[^?]*/g, '');
      self.add(href, thisResource.url);
    }
  });
}

function validHref(href) {
  if (!href) { return false; }
  if (/^(tel:|mailto:|javascript:|#)/.test(href)) { return false; }
  return true;
}

module.exports = hrefs;
