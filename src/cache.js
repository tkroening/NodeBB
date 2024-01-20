'use strict';

const cacheCreate = require('./cache/lru').default;

module.exports = cacheCreate({
    name: 'local',
    max: 40000,
    ttl: 0,
});
