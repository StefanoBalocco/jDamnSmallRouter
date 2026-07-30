import test from 'ava';
import { JSDOM } from 'jsdom';
const html = '<!DOCTYPE html><html><body></body></html>';
const origDom = new JSDOM(html, { url: 'http://localhost/' });
Object.assign(globalThis, { window: origDom.window });
const origModule = await import('../../dist/jDamnSmallRouter.js');
const minDom = new JSDOM(html, { url: 'http://localhost/' });
Object.assign(globalThis, { window: minDom.window });
const minModule = await import('../../dist/jDamnSmallRouter.min.js');
const targets = [
    { tag: '[jDamnSmallRouter-original]', router: origModule.default, win: origDom.window },
    { tag: '[jDamnSmallRouter-minified]', router: minModule.default, win: minDom.window },
];
for (const target of targets) {
    test.serial(target.tag + ' route: calls 500 handler when available returns false and no 403 handlers', async (t) => {
        let called500 = false;
        target.router.routeSpecialAdd(500, () => { called500 = true; });
        target.router.routeAdd('/route/fallback500', () => { }, () => false);
        await target.router.route('/route/fallback500');
        target.router.routeDel('/route/fallback500');
        t.true(called500);
    });
    test.serial(target.tag + ' route: no match with no 404 but 500 handler dispatches 500', async (t) => {
        let called500 = false;
        target.router.routeSpecialAdd(500, () => { called500 = true; });
        await target.router.route('/route/no-match-500');
        t.true(called500);
    });
    test.serial(target.tag + ' routeSpecialAdd: sets 403 handler and returns true', (t) => {
        t.true(target.router.routeSpecialAdd(403, () => { }));
    });
    test.serial(target.tag + ' routeSpecialAdd: sets 404 handler and returns true', (t) => {
        t.true(target.router.routeSpecialAdd(404, () => { }));
    });
    test.serial(target.tag + ' routeSpecialAdd: sets 500 handler and returns true', (t) => {
        t.true(target.router.routeSpecialAdd(500, () => { }));
    });
    test.serial(target.tag + ' routeSpecialAdd: throws RangeError for invalid code', (t) => {
        t.throws(() => target.router.routeSpecialAdd(200, () => { }), { instanceOf: RangeError });
    });
    test.serial(target.tag + ' routeAdd: returns true for a new route', (t) => {
        t.true(target.router.routeAdd('/routeadd/new', () => { }));
        target.router.routeDel('/routeadd/new');
    });
    test.serial(target.tag + ' routeAdd: returns false for a duplicate route', (t) => {
        target.router.routeAdd('/routeadd/dup', () => { });
        t.false(target.router.routeAdd('/routeadd/dup', () => { }));
        target.router.routeDel('/routeadd/dup');
    });
    test.serial(target.tag + ' routeAdd: returns false for an equivalent route (AZ09 overlaps AZ)', (t) => {
        target.router.routeAdd('/routeadd/equiv/az09-az/:id', () => { });
        t.false(target.router.routeAdd('/routeadd/equiv/az09-az/:name[AZ]', () => { }));
        target.router.routeDel('/routeadd/equiv/az09-az/:id');
    });
    test.serial(target.tag + ' routeAdd: returns false for an equivalent route (AZ09 overlaps 09)', (t) => {
        target.router.routeAdd('/routeadd/equiv/az09-09/:id', () => { });
        t.false(target.router.routeAdd('/routeadd/equiv/az09-09/:name[09]', () => { }));
        target.router.routeDel('/routeadd/equiv/az09-09/:id');
    });
    test.serial(target.tag + ' routeAdd: throws SyntaxError for duplicate path id', (t) => {
        t.throws(() => target.router.routeAdd('/routeadd/:id/sub/:id', () => { }), { instanceOf: SyntaxError });
    });
    test.serial(target.tag + ' routeAdd: throws SyntaxError for duplicate path id with bracket type', (t) => {
        t.throws(() => target.router.routeAdd('/routeadd/:id[09]/sub/:id[09]', () => { }), { instanceOf: SyntaxError });
    });
    test.serial(target.tag + ' routeDel: returns true for an existing route', (t) => {
        target.router.routeAdd('/routedel/existing', () => { });
        t.true(target.router.routeDel('/routedel/existing'));
    });
    test.serial(target.tag + ' routeDel: returns false for a non-existent route', (t) => {
        t.false(target.router.routeDel('/routedel/nonexistent'));
    });
    test.serial(target.tag + ' routeDel: throws SyntaxError for duplicate path id', (t) => {
        t.throws(() => target.router.routeDel('/routedel/:id/sub/:id'), { instanceOf: SyntaxError });
    });
    test.serial(target.tag + ' route: calls routeFunction when route matches', async (t) => {
        let called = false;
        target.router.routeAdd('/route/match', () => { called = true; });
        await target.router.route('/route/match');
        target.router.routeDel('/route/match');
        t.true(called);
    });
    test.serial(target.tag + ' route: passes correct hashPath', async (t) => {
        let received = '';
        target.router.routeAdd('/route/hashpath', (_rp, hashPath) => { received = hashPath; });
        await target.router.route('/route/hashpath');
        target.router.routeDel('/route/hashpath');
        t.is(received, '/route/hashpath');
    });
    test.serial(target.tag + ' route: passes correct routePath', async (t) => {
        let received = '';
        target.router.routeAdd('/route/routepath/:id', (routePath) => { received = routePath; });
        await target.router.route('/route/routepath/abc');
        target.router.routeDel('/route/routepath/:id');
        t.is(received, '/route/routepath/:AZ09');
    });
    test.serial(target.tag + ' route: passes correct params', async (t) => {
        let received = {};
        target.router.routeAdd('/route/params/:name[AZ]/:num[09]', (_rp, _hp, params) => {
            received = params ?? {};
        });
        await target.router.route('/route/params/abc/123');
        target.router.routeDel('/route/params/:name[AZ]/:num[09]');
        t.is(received['name'], 'abc');
        t.is(received['num'], '123');
    });
    test.serial(target.tag + ' route: calls route-specific 403 when available returns false', async (t) => {
        let called403 = false;
        let calledRoute = false;
        target.router.routeAdd('/route/avail/specific403', () => { calledRoute = true; }, () => false, () => { called403 = true; });
        await target.router.route('/route/avail/specific403');
        target.router.routeDel('/route/avail/specific403');
        t.true(called403);
        t.false(calledRoute);
    });
    test.serial(target.tag + ' route: calls routeFunction when async available returns true', async (t) => {
        let called = false;
        target.router.routeAdd('/route/avail/async', () => { called = true; }, async () => true);
        await target.router.route('/route/avail/async');
        target.router.routeDel('/route/avail/async');
        t.true(called);
    });
    test.serial(target.tag + ' route: non-async available returning a Promise is awaited before route handler', async (t) => {
        let handlerCalled = false;
        let resolveAvailable;
        const availablePromise = new Promise(resolve => { resolveAvailable = resolve; });
        target.router.routeAdd('/route/avail/promise-return', () => { handlerCalled = true; }, () => availablePromise);
        const routePromise = target.router.route('/route/avail/promise-return');
        t.false(handlerCalled, 'handler must not execute before available resolves');
        resolveAvailable(true);
        await routePromise;
        t.true(handlerCalled);
        target.router.routeDel('/route/avail/promise-return');
    });
    test.serial(target.tag + ' route: calls 404 handler when no route matches', async (t) => {
        let called = false;
        target.router.routeSpecialAdd(404, () => { called = true; });
        await target.router.route('/route/no-match-xyz');
        t.true(called);
    });
    test.serial(target.tag + ' route: calls global 403 when available returns false and no route-specific 403', async (t) => {
        let calledGlobal403 = false;
        let calledRoute = false;
        target.router.routeSpecialAdd(403, () => { calledGlobal403 = true; });
        target.router.routeAdd('/route/avail/global403', () => { calledRoute = true; }, () => false);
        await target.router.route('/route/avail/global403');
        target.router.routeDel('/route/avail/global403');
        t.true(calledGlobal403);
        t.false(calledRoute);
    });
    test.serial(target.tag + ' route: null routeFunction403 falls through to global 403', async (t) => {
        let called403 = false;
        let called404 = false;
        let called500 = false;
        let calledRoute = false;
        target.router.routeSpecialAdd(403, () => { called403 = true; });
        target.router.routeSpecialAdd(404, () => { called404 = true; });
        target.router.routeSpecialAdd(500, () => { called500 = true; });
        target.router.routeAdd('/route/null-403', () => { calledRoute = true; }, () => false, null);
        await target.router.route('/route/null-403');
        target.router.routeDel('/route/null-403');
        t.true(called403, 'global 403 must be called');
        t.false(called404, '404 must not be called');
        t.false(called500, '500 must not be called');
        t.false(calledRoute, 'route handler must not be called');
    });
    test.serial(target.tag + ' route: dispatches 404 when params do not match constraints', async (t) => {
        let called404 = false;
        let calledRoute = false;
        target.router.routeSpecialAdd(404, () => { called404 = true; });
        target.router.routeAdd('/route/paramconstraint/:id[09]', () => { calledRoute = true; });
        await target.router.route('/route/paramconstraint/abc');
        target.router.routeDel('/route/paramconstraint/:id[09]');
        t.true(called404);
        t.false(calledRoute);
    });
    test.serial(target.tag + ' route: static route beats variable route', async (t) => {
        let matchedPath = '';
        target.router.routeAdd('/route/static-or-var/static', () => { matchedPath = 'static'; });
        target.router.routeAdd('/route/static-or-var/:param', () => { matchedPath = 'variable'; });
        await target.router.route('/route/static-or-var/static');
        target.router.routeDel('/route/static-or-var/static');
        target.router.routeDel('/route/static-or-var/:param');
        t.is(matchedPath, 'static');
    });
    test.serial(target.tag + ' route: untyped parameter defaults to AZ09', async (t) => {
        let received = {};
        target.router.routeAdd('/route/untyped/:id', (_rp, _hp, params) => {
            received = params ?? {};
        });
        await target.router.route('/route/untyped/abc123');
        target.router.routeDel('/route/untyped/:id');
        t.is(received['id'], 'abc123');
    });
    test.serial(target.tag + ' route: truthy non-function available dispatches 403', async (t) => {
        let called403 = false;
        let calledRoute = false;
        target.router.routeSpecialAdd(403, () => { called403 = true; });
        target.router.routeAdd('/route/nonfn-avail', () => { calledRoute = true; }, true);
        await target.router.route('/route/nonfn-avail');
        target.router.routeDel('/route/nonfn-avail');
        t.true(called403);
        t.false(calledRoute);
    });
    test.serial(target.tag + ' route: concurrent direct routes — B settles before A is released', async (t) => {
        const executed = [];
        let resolveA;
        const gateA = new Promise(resolve => { resolveA = resolve; });
        target.router.routeAdd('/route/concurrent/a', async () => {
            await gateA;
            executed.push('A');
        });
        target.router.routeAdd('/route/concurrent/b', () => {
            executed.push('B');
        });
        const pA = target.router.route('/route/concurrent/a');
        const pB = target.router.route('/route/concurrent/b');
        await pB;
        t.deepEqual(executed, ['B'], 'B must execute before A is released');
        t.is(executed.indexOf('A'), -1, 'A must not have executed yet');
        resolveA();
        await pA;
        t.deepEqual(executed, ['B', 'A'], 'A must execute after release');
        target.router.routeDel('/route/concurrent/a');
        target.router.routeDel('/route/concurrent/b');
    });
    test.serial(target.tag + ' route: nested awaited direct-route does not deadlock — child runs before parent resumes', async (t) => {
        const executed = [];
        target.router.routeAdd('/nested-deadlock/parent', async () => {
            await target.router.route('/nested-deadlock/child');
            executed.push('parent-resume');
        });
        target.router.routeAdd('/nested-deadlock/child', () => {
            executed.push('child');
        });
        await target.router.route('/nested-deadlock/parent');
        t.deepEqual(executed, ['child', 'parent-resume'], 'child must execute before parent resumes');
        let laterRan = false;
        target.router.routeAdd('/nested-deadlock/later', () => { laterRan = true; });
        await target.router.route('/nested-deadlock/later');
        t.true(laterRan);
        target.router.routeDel('/nested-deadlock/parent');
        target.router.routeDel('/nested-deadlock/child');
        target.router.routeDel('/nested-deadlock/later');
    });
    test.serial(target.tag + ' route: non-async callback returning a Promise is awaited', async (t) => {
        let executed = false;
        let resolvePromise;
        const promise = new Promise(resolve => { resolvePromise = resolve; });
        target.router.routeAdd('/route/promise-return/single', () => {
            return promise.then(() => { executed = true; });
        });
        const p = target.router.route('/route/promise-return/single');
        t.false(executed, 'handler must not execute before promise resolves');
        resolvePromise();
        await p;
        t.true(executed, 'handler must execute after promise resolves');
        target.router.routeDel('/route/promise-return/single');
    });
    test.serial(target.tag + ' trigger: sets hash and routes when path differs from current hash', async (t) => {
        let called = false;
        target.router.routeAdd('/trigger/route', () => { called = true; });
        target.win.location.hash = '';
        target.router.trigger('/trigger/route');
        await new Promise(resolve => setTimeout(resolve, 0));
        target.router.routeDel('/trigger/route');
        t.true(called);
        t.is(target.win.location.hash, '#/trigger/route');
        target.win.location.hash = '';
    });
    test.serial(target.tag + ' trigger: does not change hash when path matches current hash', (t) => {
        target.win.location.hash = '#/trigger/same';
        target.router.trigger('/trigger/same');
        t.is(target.win.location.hash, '#/trigger/same');
        target.win.location.hash = '';
    });
    test.serial(target.tag + ' trigger: returns undefined and only changes hash', (t) => {
        target.win.location.hash = '';
        const returnValue = target.router.trigger('/trigger/only-hash');
        t.is(returnValue, undefined);
        t.is(target.win.location.hash, '#/trigger/only-hash');
        target.win.location.hash = '';
    });
    test.serial(target.tag + ' checkHash: does nothing when hash is empty', async (t) => {
        target.win.location.hash = '';
        await target.router.checkHash();
        t.pass();
    });
    test.serial(target.tag + ' checkHash: routes when hash is set', async (t) => {
        let called = false;
        target.router.routeAdd('/checkhash/route', () => { called = true; });
        target.win.location.hash = '#/checkhash/route';
        await new Promise(resolve => setTimeout(resolve, 0));
        target.router.routeDel('/checkhash/route');
        target.win.location.hash = '';
        t.true(called);
    });
    test.serial(target.tag + ' route: current succeeds, queued continuation drains — A resolves, B executes', async (t) => {
        let aExecuted = false;
        let bExecuted = false;
        let resolveA;
        const awaitA = new Promise(resolve => { resolveA = resolve; });
        target.router.routeAdd('/error/prop/a-ok-b-ok/a', async () => {
            await awaitA;
            aExecuted = true;
        });
        target.router.routeAdd('/error/prop/a-ok-b-ok/b', () => {
            bExecuted = true;
        });
        const pA = target.router.route('/error/prop/a-ok-b-ok/a');
        await new Promise(resolve => setTimeout(resolve, 0));
        target.win.location.hash = '#/error/prop/a-ok-b-ok/b';
        await target.router.checkHash();
        resolveA();
        await t.notThrowsAsync(async () => pA);
        t.true(aExecuted);
        t.true(bExecuted, 'B must execute during recursive drain');
        target.router.routeDel('/error/prop/a-ok-b-ok/a');
        target.router.routeDel('/error/prop/a-ok-b-ok/b');
        target.win.location.hash = '';
    });
    test.serial(target.tag + ' route: re-entrant FIFO — nested checkHash during drain recursion, all succeed', async (t) => {
        const executed = [];
        let resolveA;
        let resolveB;
        let onBStarted;
        const bStarted = new Promise(resolve => { onBStarted = resolve; });
        target.router.routeAdd('/reentrant-success/a', async () => {
            await new Promise(resolve => { resolveA = resolve; });
            executed.push('A');
        });
        target.router.routeAdd('/reentrant-success/b', async () => {
            onBStarted();
            await new Promise(resolve => { resolveB = resolve; });
            executed.push('B');
        });
        target.router.routeAdd('/reentrant-success/c', () => {
            executed.push('C');
        });
        const pA = target.router.route('/reentrant-success/a');
        await new Promise(resolve => setTimeout(resolve, 0));
        target.win.location.hash = '#/reentrant-success/b';
        await target.router.checkHash();
        resolveA();
        await bStarted;
        target.win.location.hash = '#/reentrant-success/c';
        await target.router.checkHash();
        resolveB();
        await pA;
        t.deepEqual(executed, ['A', 'B', 'C'], 'dispatch order must be A → B → C');
        target.router.routeDel('/reentrant-success/a');
        target.router.routeDel('/reentrant-success/b');
        target.router.routeDel('/reentrant-success/c');
        target.win.location.hash = '';
    });
    test.serial(target.tag + ' route: matched denied without 403 selects registered 404 before 500', async (t) => {
        let called404 = false;
        let called500 = false;
        target.router.routeSpecialAdd(404, () => { called404 = true; });
        target.router.routeSpecialAdd(500, () => { called500 = true; });
        target.router.routeSpecialAdd(403, null);
        target.router.routeAdd('/route/prec/denied-no403', () => { }, () => false);
        await target.router.route('/route/prec/denied-no403');
        t.true(called404, '404 must be called for denied route with no 403');
        t.false(called500, '500 must not be called when 404 handles it');
        target.router.routeDel('/route/prec/denied-no403');
    });
    test.serial(target.tag + ' route: no match retains 404 precedence when both 404 and 500 are callable', async (t) => {
        let called404 = false;
        let called500 = false;
        target.router.routeSpecialAdd(404, () => { called404 = true; });
        target.router.routeSpecialAdd(500, () => { called500 = true; });
        await target.router.route('/route/prec/no-match-nonexistent');
        t.true(called404);
        t.false(called500);
    });
    test.serial(target.tag + ' route: no match with null 404 falls through to callable 500', async (t) => {
        let called500 = false;
        target.router.routeSpecialAdd(404, null);
        target.router.routeSpecialAdd(500, () => { called500 = true; });
        await target.router.route('/route/no-match-null404-500');
        t.true(called500);
    });
    test.serial(target.tag + ' route: static path with dot uses regex . metachar — matches /a.b and /axb', async (t) => {
        let matched = 0;
        let called404 = false;
        target.router.routeSpecialAdd(404, () => { called404 = true; });
        target.router.routeAdd('/review-static/a.b', () => { matched++; });
        await target.router.route('/review-static/a.b');
        t.is(matched, 1, '/a.b must match');
        t.false(called404, 'exact match must not trigger 404');
        await target.router.route('/review-static/axb');
        t.is(matched, 2, '/axb must also match because . is unescaped');
        t.false(called404, '/axb must not trigger 404');
        target.router.routeDel('/review-static/a.b');
    });
    test.serial(target.tag + ' routeDel: deleting untyped equivalent removes first matching registered route', async (t) => {
        let matchedAZ = false;
        let matched09 = false;
        let called404 = false;
        target.router.routeSpecialAdd(404, () => { called404 = true; });
        target.router.routeAdd('/route/delequiv/:param[AZ]', () => { matchedAZ = true; });
        target.router.routeAdd('/route/delequiv/:param[09]', () => { matched09 = true; });
        await target.router.route('/route/delequiv/abc');
        t.true(matchedAZ, 'AZ handler must fire before deletion');
        called404 = false;
        matchedAZ = false;
        await target.router.route('/route/delequiv/123');
        t.true(matched09, '09 handler must fire before deletion');
        matched09 = false;
        const deleted = target.router.routeDel('/route/delequiv/:param');
        t.true(deleted, 'routeDel must return true');
        called404 = false;
        await target.router.route('/route/delequiv/abc');
        t.false(matchedAZ, 'AZ handler must not fire after deletion');
        t.true(called404, 'deleted AZ route must trigger 404');
        called404 = false;
        await target.router.route('/route/delequiv/123');
        t.true(matched09, '09 handler must still fire after AZ deletion');
        t.false(called404, '09 route must not trigger 404');
        target.router.routeDel('/route/delequiv/:param[09]');
        target.router.routeSpecialAdd(404, null);
    });
}
