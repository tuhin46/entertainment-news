const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');

function contentService(http, storage = new Map()) {
    let factory;
    const q = fn => new Promise(fn); q.when = value => Promise.resolve(value); q.reject = e => Promise.reject(e);
    const context = { app: { factory: (_, fn) => { factory = fn; } }, angular: { extend: Object.assign, copy: x => structuredClone(x) },
        localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
        window: { crypto: crypto.webcrypto }, Uint8Array, Blob, atob };
    vm.runInNewContext(fs.readFileSync('js/services/ContentService.js', 'utf8'), context);
    return factory({ $broadcast() {} }, http, q);
}

test('content only appears after server success; rejected writes preserve state and retry identifier', async () => {
    let fail = true;
    const ids = [];
    const svc = contentService({ get: async () => ({ data: { items: [], ticker: 'Live' } }),
        post: async (_, input) => {
            ids.push(input.requestId);
            if (fail) throw { data: { error: 'Drive unavailable' } };
            return { data: { items: [{ ...input.item, id: 1000, version: 1 }], ticker: 'Live' } };
        } });
    await svc.load(false);
    await assert.rejects(svc.add({ title: 'Story', category: 'Movies' }), /Drive unavailable/);
    assert.equal(svc.getAll().length, 0);
    fail = false;
    await svc.add({ title: 'Story', category: 'Movies' });
    assert.equal(ids[0], ids[1]);
    assert.equal(svc.getAll()[0].title, 'Story');
});

test('legacy import uploads each item sequentially and preserves IDs', async () => {
    const actions = [];
    const svc = contentService({ post: async (_, input) => {
        actions.push(input);
        return { data: { items: [], ticker: '' } };
    } });
    await svc.importLegacy({ items: [{ id: 10, title: 'One' }, { id: 20, title: 'Two' }], ticker: 'New ticker' });
    assert.equal(actions.length, 3);
    assert.deepEqual(actions.map(x => x.id), [10, 20, undefined]);
    assert.equal(actions[2].action, 'ticker');
});

test('every content route waits for storage and admin waits for verified session', () => {
    let routes = {};
    const provider = { when(path, config) { routes[path] = config; return this; }, otherwise() { return this; } };
    const context = { angular: { module: () => ({ config(fn) { fn(provider, { hashPrefix() {} }); }, controller() {}, run() {} }) } };
    vm.runInNewContext(fs.readFileSync('js/app.js', 'utf8'), context);
    for (const path of ['/home', '/movies', '/music', '/celebrities', '/trending', '/influencers', '/bookmarks', '/news/:id']) {
        assert.equal(typeof routes[path].resolve.contentReady, 'function', path);
    }
    const calls = [];
    const resolver = routes['/admin/dashboard'].resolve.authCheck;
    return resolver({ reject: Promise.reject.bind(Promise) }, { path() {} },
        { check: async () => true }, { load: async admin => { calls.push(admin); } })
        .then(() => assert.deepEqual(calls, [true]));
});


test('browser analytics preserves legacy counts across shared reloads without writing content', async () => {
    const storage = new Map([['ep_content_db', JSON.stringify([{id: 1, views: 4}])], ['ep_site_visits', '8']]);
    const svc = contentService({get: async () => ({data: {items: [{id: 1, category: 'Movies', status: 'Published'}], ticker: ''}}),
        post: () => { throw new Error('Analytics must not write shared content'); }}, storage);
    await svc.load(false);
    svc.recordView(1); svc.recordVisit();
    await svc.load(false);
    assert.equal(svc.getStats().totalContentViews, 5);
    assert.equal(svc.getStats().siteVisits, 9);
    assert.equal(JSON.parse(storage.get('ep_content_views'))['1'], 5);
    assert.equal(JSON.parse(storage.get('ep_content_db'))[0].views, 4);
});
