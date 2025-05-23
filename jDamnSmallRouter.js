'use strict';
class jDamnSmallRouter {
    static _instance;
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
    _regexDuplicatePathId = new RegExp(/\/(:\w+)\[(?:09|AZ)]\/(?:.+\/)?(\1)(?:\[(?:09|AZ)]|\/|$)/g);
    _regexSearchVariables = new RegExp(/(?<=^|\/):(\w+)(?:\[(09|AZ)])?(?=\/|$)/g);
    _routes = [];
    _routeFunction403;
    _routeFunction404;
    _routeFunction500;
    _routing = false;
    _queue = [];
    _window = window;
    _location = this._window.location;
    constructor() {
        this._window.addEventListener('hashchange', this.CheckHash.bind(this));
    }
    _getHash() {
        return this._location.hash.substring(1);
    }
    RouteSpecialAdd(code, routeFunction) {
        let returnValue = false;
        switch (code) {
            case 403: {
                this._routeFunction403 = routeFunction;
                returnValue = true;
                break;
            }
            case 404: {
                this._routeFunction404 = routeFunction;
                returnValue = true;
                break;
            }
            case 500: {
                this._routeFunction500 = routeFunction;
                returnValue = true;
                break;
            }
            default: {
                throw new RangeError();
            }
        }
        return returnValue;
    }
    RouteAdd(path, routeFunction, available, routeFunction403) {
        let returnValue = false;
        if (path.match(this._regexDuplicatePathId)) {
            throw new SyntaxError('Duplicate path id');
        }
        else {
            let weight = 0;
            let regex = new RegExp('^' + path.replace(this._regexSearchVariables, function (_, name, type) {
                let returnValue = '(?<' + name + '>[';
                switch (type) {
                    case '09': {
                        returnValue += '\\d';
                        break;
                    }
                    case 'AZ': {
                        returnValue += 'a-zA-Z';
                        break;
                    }
                    case 'AZ09':
                    default: {
                        returnValue += 'a-zA-Z\\d';
                    }
                }
                returnValue += ']+)';
                return returnValue;
            }).replace(/\//g, '\\\/') + '$');
            const reducedPath = path.replace(this._regexSearchVariables, (_, __, component) => `:${component ?? 'AZ09'}`);
            const paths = path.split('/');
            const cFL = paths.length;
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
                this._routes.sort((a, b) => ((a.weight > b.weight) ? -1 : ((b.weight > a.weight) ? 1 : 0)));
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
            const reducedPath = path.replace(this._regexSearchVariables, (_, __, component) => `:${component ?? 'AZ09'}`);
            const index = this._routes.findIndex((route) => jDamnSmallRouter._checkRouteEquivalence(reducedPath, route.path));
            if (-1 < index) {
                this._routes.splice(index, 1);
                returnValue = true;
            }
        }
        return returnValue;
    }
    async Trigger(path) {
        if ((undefined !== path) && (path != this._getHash())) {
            this._location.hash = '#' + path;
        }
        return await this.CheckHash();
    }
    async Route(path) {
        let returnValue = true;
        this._queue.push(path);
        if (this._routing) {
            returnValue = false;
        }
        else {
            this._routing = true;
            while (path = this._queue.shift()) {
                let routePath;
                let routeFunction;
                const routes = this._routes.filter((route) => !!route.match.exec(path)).sort((left, right) => right.weight - left.weight);
                let params = {};
                if (0 < routes.length) {
                    const route = routes[0];
                    params = route.match.exec(path).groups ?? {};
                    routePath = route.path;
                    let available = route.available ? (('function' === typeof route.available) && await route.available(routePath, path, params)) : true;
                    routeFunction = (available ? route.routeFunction : (route.routeFunction403 ?? this._routeFunction403));
                    if (('function' !== typeof routeFunction)) {
                        routeFunction = this._routeFunction500;
                    }
                }
                else {
                    routeFunction = this._routeFunction404;
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
