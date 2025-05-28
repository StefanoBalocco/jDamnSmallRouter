'use strict';
class jDamnSmallRouter {
    static _instance;
    static _window = window;
    static _location = jDamnSmallRouter._window.location;
    static _getDamnSmallRouter() {
        if (undefined === jDamnSmallRouter._instance) {
            jDamnSmallRouter._instance = new jDamnSmallRouter();
        }
        return jDamnSmallRouter._instance;
    }
    static _checkRouteEquivalence(path1, path2) {
        const generateVariants = (path) => {
            let returnValue = [path];
            if (path.includes(':AZ09')) {
                returnValue.push(...generateVariants(path.replace(/:AZ09/, ':AZ')), ...generateVariants(path.replace(/:AZ09/, ':09')));
            }
            return returnValue;
        };
        const variants = new Set(generateVariants(path1));
        return [...generateVariants(path2)].some((x) => variants.has(x));
    }
    _regexDuplicatePathId = /\/(:\w+)\[(?:09|AZ)]\/(?:.+\/)?(\1)(?:\[(?:09|AZ)]|\/|$)/;
    _regexSearchVariables = /(?<=^|\/):(\w+)(?:\[(09|AZ)])?(?=\/|$)/g;
    _routes = [];
    _routeSpecialFunction = [];
    _routing = false;
    _queue = [];
    constructor() {
        jDamnSmallRouter._window.addEventListener('hashchange', this.CheckHash.bind(this));
    }
    _getHash() {
        return jDamnSmallRouter._location.hash.substring(1);
    }
    RouteSpecialAdd(code, routeFunction) {
        let returnValue = false;
        if ([403, 404, 500].includes(code)) {
            this._routeSpecialFunction[code] = routeFunction;
            returnValue = true;
        }
        else {
            throw new RangeError();
        }
        return returnValue;
    }
    RouteAdd(path, routeFunction, available, routeFunction403) {
        let returnValue = false;
        if (path.match(this._regexDuplicatePathId)) {
            throw new SyntaxError('Duplicate path id');
        }
        else {
            const regex = new RegExp('^' + path.replaceAll(this._regexSearchVariables, (_, name, type) => {
                const characterClass = {
                    '09': '\\d',
                    'AZ': 'a-zA-Z',
                    'AZ09': 'a-zA-Z\\d'
                }[type] ?? 'a-zA-Z\\d';
                return `(?<${name}>[${characterClass}]+)`;
            }).replace(/\//g, '\\\/') + '$');
            const reducedPath = path.replaceAll(this._regexSearchVariables, (_, __, component) => `:${component ?? 'AZ09'}`);
            const paths = path.split('/');
            const cFL = paths.length;
            let weight = 0;
            for (let iFL = 0; iFL < cFL; iFL++) {
                if (!paths[iFL].startsWith(':')) {
                    weight += 2 ** (cFL - iFL - 1);
                }
            }
            if (!this._routes.find((route) => jDamnSmallRouter._checkRouteEquivalence(reducedPath, route.path))) {
                this._routes.push({
                    path: reducedPath,
                    match: regex,
                    weight: weight,
                    routeFunction: routeFunction,
                    available: available,
                    routeFunction403: routeFunction403
                });
                this._routes.sort((a, b) => (b.weight - a.weight));
                returnValue = true;
            }
        }
        return returnValue;
    }
    RouteDel(path) {
        let returnValue = false;
        if (path.match(this._regexDuplicatePathId)) {
            throw new SyntaxError('Duplicate path id');
        }
        else {
            const reducedPath = path.replaceAll(this._regexSearchVariables, (_, __, component) => `:${component ?? 'AZ09'}`);
            const index = this._routes.findIndex((route) => jDamnSmallRouter._checkRouteEquivalence(reducedPath, route.path));
            if (-1 < index) {
                this._routes.splice(index, 1);
                returnValue = true;
            }
            else {
                throw new Error('Duplicated path');
            }
        }
        return returnValue;
    }
    async Trigger(path) {
        if ((undefined !== path) && (this._getHash() !== path)) {
            jDamnSmallRouter._location.hash = '#' + path;
        }
        return await this.CheckHash();
    }
    async Route(path) {
        let returnValue = false;
        this._queue.push(path);
        if (!this._routing) {
            returnValue = true;
            this._routing = true;
            while (path = this._queue.shift()) {
                let routePath;
                let routeFunction;
                let params = {};
                const route = this._routes.find((route) => !!route.match.exec(path));
                if (route) {
                    params = route.match.exec(path).groups ?? {};
                    routePath = route.path;
                    let available = (route.available ? (('function' === typeof route.available) && await route.available(routePath, path, params)) : true);
                    routeFunction = (available ? route.routeFunction : (route.routeFunction403 ?? this._routeSpecialFunction[403]));
                    if ('function' !== typeof routeFunction) {
                        routeFunction = this._routeSpecialFunction[500];
                    }
                }
                else {
                    routeFunction = this._routeSpecialFunction[404];
                }
                if ('function' === typeof routeFunction) {
                    await routeFunction(routePath, path, params);
                }
            }
            this._routing = false;
        }
        return returnValue;
    }
    async CheckHash() {
        const hash = this._getHash();
        return (hash ? await this.Route(hash) : false);
    }
}
export default jDamnSmallRouter._getDamnSmallRouter;
