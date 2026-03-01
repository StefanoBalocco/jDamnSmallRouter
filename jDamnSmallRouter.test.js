import test from 'ava';
const mockLocation = { hash: '' };
globalThis.window = {
    location: mockLocation,
    addEventListener: () => { }
};
import GetInstance from './jDamnSmallRouter.js';
const router = GetInstance();
let prefix = '';
{
    prefix = 'RouteSpecialAdd';
    test(prefix + ': returns true for code 403', (t) => {
        t.true(router.RouteSpecialAdd(403, () => { }));
    });
    test(prefix + ': returns true for code 404', (t) => {
        t.true(router.RouteSpecialAdd(404, () => { }));
    });
    test(prefix + ': returns true for code 500', (t) => {
        t.true(router.RouteSpecialAdd(500, () => { }));
    });
    test(prefix + ': returns false for an invalid code', (t) => {
        t.false(router.RouteSpecialAdd(200, () => { }));
    });
}
{
    prefix = 'RouteAdd';
    test(prefix + ': returns true for a new route', (t) => {
        t.true(router.RouteAdd('/routeadd/new', () => { }));
        router.RouteDel('/routeadd/new');
    });
    test(prefix + ': returns false for a duplicate route', (t) => {
        router.RouteAdd('/routeadd/dup', () => { });
        t.false(router.RouteAdd('/routeadd/dup', () => { }));
        router.RouteDel('/routeadd/dup');
    });
    test(prefix + ': returns false for an equivalent route (AZ09 overlaps AZ)', (t) => {
        router.RouteAdd('/routeadd/equiv/az09-az/:id', () => { });
        t.false(router.RouteAdd('/routeadd/equiv/az09-az/:name[AZ]', () => { }));
        router.RouteDel('/routeadd/equiv/az09-az/:id');
    });
    test(prefix + ': returns false for an equivalent route (AZ09 overlaps 09)', (t) => {
        router.RouteAdd('/routeadd/equiv/az09-09/:id', () => { });
        t.false(router.RouteAdd('/routeadd/equiv/az09-09/:name[09]', () => { }));
        router.RouteDel('/routeadd/equiv/az09-09/:id');
    });
    test(prefix + ': throws SyntaxError for duplicate path id', (t) => {
        t.throws(() => router.RouteAdd('/routeadd/:id/sub/:id', () => { }), { instanceOf: SyntaxError });
    });
    test(prefix + ': throws SyntaxError for duplicate path id with bracket type', (t) => {
        t.throws(() => router.RouteAdd('/routeadd/:id[09]/sub/:id[09]', () => { }), { instanceOf: SyntaxError });
    });
}
{
    prefix = 'RouteDel';
    test(prefix + ': returns true for an existing route', (t) => {
        router.RouteAdd('/routedel/existing', () => { });
        t.true(router.RouteDel('/routedel/existing'));
    });
    test(prefix + ': returns false for a non-existent route', (t) => {
        t.false(router.RouteDel('/routedel/nonexistent'));
    });
    test(prefix + ': throws SyntaxError for duplicate path id', (t) => {
        t.throws(() => router.RouteDel('/routedel/:id/sub/:id'), { instanceOf: SyntaxError });
    });
}
{
    prefix = 'Route';
    test.serial(prefix + ': calls routeFunction when route matches', async (t) => {
        let called = false;
        router.RouteAdd('/route/match', () => { called = true; });
        await router.Route('/route/match');
        router.RouteDel('/route/match');
        t.true(called);
    });
    test.serial(prefix + ': passes correct hashPath', async (t) => {
        let received = '';
        router.RouteAdd('/route/hashpath', (_rp, hashPath) => { received = hashPath; });
        await router.Route('/route/hashpath');
        router.RouteDel('/route/hashpath');
        t.is(received, '/route/hashpath');
    });
    test.serial(prefix + ': passes correct routePath', async (t) => {
        let received = '';
        router.RouteAdd('/route/routepath/:id', (routePath) => { received = routePath; });
        await router.Route('/route/routepath/abc');
        router.RouteDel('/route/routepath/:id');
        t.is(received, '/route/routepath/:AZ09');
    });
    test.serial(prefix + ': passes correct params', async (t) => {
        let received = {};
        router.RouteAdd('/route/params/:name[AZ]/:num[09]', (_rp, _hp, params) => {
            received = params ?? {};
        });
        await router.Route('/route/params/abc/123');
        router.RouteDel('/route/params/:name[AZ]/:num[09]');
        t.is(received['name'], 'abc');
        t.is(received['num'], '123');
    });
    test.serial(prefix + ': calls route-specific 403 when available returns false', async (t) => {
        let called403 = false;
        let calledRoute = false;
        router.RouteAdd('/route/avail/specific403', () => { calledRoute = true; }, () => false, () => { called403 = true; });
        await router.Route('/route/avail/specific403');
        router.RouteDel('/route/avail/specific403');
        t.true(called403);
        t.false(calledRoute);
    });
    test.serial(prefix + ': calls routeFunction when async available returns true', async (t) => {
        let called = false;
        router.RouteAdd('/route/avail/async', () => { called = true; }, async () => true);
        await router.Route('/route/avail/async');
        router.RouteDel('/route/avail/async');
        t.true(called);
    });
    test.serial(prefix + ': calls 404 handler when no route matches', async (t) => {
        let called = false;
        router.RouteSpecialAdd(404, () => { called = true; });
        await router.Route('/route/no-match-xyz');
        t.true(called);
    });
    test.serial(prefix + ': calls global 403 when available returns false and no route-specific 403', async (t) => {
        let calledGlobal403 = false;
        let calledRoute = false;
        router.RouteSpecialAdd(403, () => { calledGlobal403 = true; });
        router.RouteAdd('/route/avail/global403', () => { calledRoute = true; }, () => false);
        await router.Route('/route/avail/global403');
        router.RouteDel('/route/avail/global403');
        t.true(calledGlobal403);
        t.false(calledRoute);
    });
    test.serial(prefix + ': returns true for first caller, false for concurrent caller', async (t) => {
        let resolveFirst;
        const firstDone = new Promise(resolve => { resolveFirst = resolve; });
        router.RouteAdd('/route/queue/first', async () => { await firstDone; });
        router.RouteAdd('/route/queue/second', () => { });
        const p1 = router.Route('/route/queue/first');
        const p2 = router.Route('/route/queue/second');
        resolveFirst();
        const [r1, r2] = await Promise.all([p1, p2]);
        router.RouteDel('/route/queue/first');
        router.RouteDel('/route/queue/second');
        t.true(r1);
        t.false(r2);
    });
    test.serial(prefix + ': processes queued routes in order', async (t) => {
        const executed = [];
        let resolveFirst;
        const firstDone = new Promise(resolve => { resolveFirst = resolve; });
        router.RouteAdd('/route/order/first', async () => {
            await firstDone;
            executed.push('first');
        });
        router.RouteAdd('/route/order/second', () => { executed.push('second'); });
        const p1 = router.Route('/route/order/first');
        void router.Route('/route/order/second');
        resolveFirst();
        await p1;
        router.RouteDel('/route/order/first');
        router.RouteDel('/route/order/second');
        t.deepEqual(executed, ['first', 'second']);
    });
}
{
    prefix = 'Trigger';
    test.serial(prefix + ': sets hash and routes when path differs from current hash', async (t) => {
        let called = false;
        router.RouteAdd('/trigger/route', () => { called = true; });
        mockLocation.hash = '';
        await router.Trigger('/trigger/route');
        router.RouteDel('/trigger/route');
        t.true(called);
        t.is(mockLocation.hash, '#/trigger/route');
        mockLocation.hash = '';
    });
    test.serial(prefix + ': routes without changing hash when path matches current hash', async (t) => {
        let callCount = 0;
        router.RouteAdd('/trigger/same', () => { callCount++; });
        mockLocation.hash = '#/trigger/same';
        await router.Trigger('/trigger/same');
        router.RouteDel('/trigger/same');
        mockLocation.hash = '';
        t.is(callCount, 1);
    });
    test.serial(prefix + ': with undefined, routes to current hash without changing it', async (t) => {
        let called = false;
        router.RouteAdd('/trigger/undefined', () => { called = true; });
        mockLocation.hash = '#/trigger/undefined';
        await router.Trigger(undefined);
        router.RouteDel('/trigger/undefined');
        mockLocation.hash = '';
        t.true(called);
    });
}
{
    prefix = 'CheckHash';
    test.serial(prefix + ': returns false when hash is empty', async (t) => {
        mockLocation.hash = '';
        t.false(await router.CheckHash());
    });
    test.serial(prefix + ': routes when hash is set', async (t) => {
        let called = false;
        router.RouteAdd('/checkhash/route', () => { called = true; });
        mockLocation.hash = '#/checkhash/route';
        await router.CheckHash();
        router.RouteDel('/checkhash/route');
        mockLocation.hash = '';
        t.true(called);
    });
}
