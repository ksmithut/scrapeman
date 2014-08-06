'use strict';

function hrefs(curPage, res, pages) {
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
