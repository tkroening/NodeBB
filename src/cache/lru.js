"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
// import LRU from 'lru-cache';
const lru_cache_1 = __importDefault(require("lru-cache"));
// lru-cache@7 deprecations
const winston_1 = __importDefault(require("winston"));
const chalk_1 = __importDefault(require("chalk"));
// pubsub import should occur after import of chalk
const pubsub_1 = __importDefault(require("../pubsub"));
function cacheCreate(opts) {
    // sometimes we kept passing in `length` with no corresponding `maxSize`.
    // This is now enforced in v7; drop superfluous property
    if (opts.hasOwnProperty('length') && !opts.hasOwnProperty('maxSize')) {
        winston_1.default.warn(`[cache/init(${opts.name})] ${chalk_1.default.white.bgRed.bold('DEPRECATION')} ${chalk_1.default.yellow('length')} was passed in without a corresponding ${chalk_1.default.yellow('maxSize')}. Both are now required as of lru-cache@7.0.0.`);
        delete opts.length;
    }
    const deprecations = new Map([
        ['stale', 'allowStale'],
        ['maxAge', 'ttl'],
        ['length', 'sizeCalculation'],
    ]);
    deprecations.forEach((newProp, oldProp) => {
        if (opts.hasOwnProperty(oldProp) && !opts.hasOwnProperty(newProp)) {
            winston_1.default.warn(`[cache/init(${opts.name})] ${chalk_1.default.white.bgRed.bold('DEPRECATION')} The option ${chalk_1.default.yellow(oldProp)} has been deprecated as of lru-cache@7.0.0. Please change this to ${chalk_1.default.yellow(newProp)} instead.`);
            /* Can pull the types of stale, maxAge, and length from the lru-cache documentation */
            opts[newProp] = opts[oldProp];
            delete opts[oldProp];
        }
    });
    const lruCache = new lru_cache_1.default(opts);
    const cache = {};
    cache.name = opts.name;
    cache.hits = 0;
    cache.misses = 0;
    cache.enabled = opts.hasOwnProperty('enabled') ? opts.enabled : true;
    // expose properties while keeping backwards compatibility
    const propertyMap = new Map([
        ['length', 'calculatedSize'],
        ['calculatedSize', 'calculatedSize'],
        ['max', 'max'],
        ['maxSize', 'maxSize'],
        ['itemCount', 'size'],
        ['size', 'size'],
        ['ttl', 'ttl'],
    ]);
    propertyMap.forEach((lruProp, cacheProp) => {
        Object.defineProperty(cache, cacheProp, {
            get: function () {
                return lruCache[lruProp];
            },
            configurable: true,
            enumerable: true,
        });
    });
    cache.set = function (key, value, ttl) {
        if (!cache.enabled) {
            return;
        }
        const opts = ttl ? { ttl: ttl } : {};
        lruCache.set.apply(lruCache, [key, value, opts]);
    };
    cache.get = function (key) {
        if (!cache.enabled) {
            return undefined;
        }
        const data = lruCache.get(key);
        if (data === undefined) {
            cache.misses += 1;
        }
        else {
            cache.hits += 1;
        }
        return data;
    };
    cache.del = function (keys) {
        if (!Array.isArray(keys)) {
            keys = [keys];
        }
        pubsub_1.default.publish(`${cache.name}:lruCache:del`, keys);
        keys.forEach(key => lruCache.delete(key));
    };
    cache.delete = cache.del;
    function localReset() {
        lruCache.clear();
        cache.hits = 0;
        cache.misses = 0;
    }
    cache.reset = function () {
        pubsub_1.default.publish(`${cache.name}:lruCache:reset`);
        localReset();
    };
    cache.clear = cache.reset;
    pubsub_1.default.on(`${cache.name}:lruCache:reset`, () => {
        localReset();
    });
    pubsub_1.default.on(`${cache.name}:lruCache:del`, (keys) => {
        if (Array.isArray(keys)) {
            keys.forEach(key => lruCache.delete(key));
        }
    });
    cache.getUnCachedKeys = function (keys, cachedData) {
        if (!cache.enabled) {
            return keys;
        }
        let data;
        let isCached;
        const unCachedKeys = keys.filter((key) => {
            data = cache.get(key);
            isCached = data !== undefined;
            if (isCached) {
                cachedData[key] = data;
            }
            return !isCached;
        });
        const hits = keys.length - unCachedKeys.length;
        const misses = keys.length - hits;
        cache.hits += hits;
        cache.misses += misses;
        return unCachedKeys;
    };
    cache.dump = function () {
        return lruCache.dump();
    };
    cache.peek = function (key) {
        return lruCache.peek(key);
    };
    return cache;
}
module.exports = cacheCreate;
