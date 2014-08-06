'use strict';

var successful = [200, 300, 301, 302, 303, 307];

function status(curPage, res, pages) {
  curPage.statusCode = res.statusCode;
  curPage._successful = successful.indexOf(res.statusCode) !== -1;
}

module.exports = status;
