'use strict';

module.exports.create = function (name) {
    const cacheCreate = require('../cache/lru').default;
    return cacheCreate({
        name: `${name}-object`,
        max: 40000,
        ttl: 0,
    });
};
