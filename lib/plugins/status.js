'use strict';

var successful = [200];

function status(thisResource, res) {
  thisResource.statusCode = res.statusCode;
  thisResource._successful = successful.indexOf(res.statusCode) !== -1;
}

module.exports = status;
