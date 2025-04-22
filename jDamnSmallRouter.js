'use strict';
class jDamnSmallRouter {
    static _instance;
    static _GetDamnSmallRouter() {
        if ('undefined' === typeof jDamnSmallRouter._instance) {
            jDamnSmallRouter._instance = new jDamnSmallRouter();
        }
        return jDamnSmallRouter._instance;
    }
    _regexDuplicatePathId = new RegExp(/\/(:\w+)\[(?:09|AZ)]\/(?:.+\/)?(\1)(?:\[(?:09|AZ)]|\/|$)/g);
    _regexSearchVariables = new RegExp(/(?<=^|\/):(\w+)(?:\[(09|AZ)])?(?=\/|$)/g);
    _routes = [];
    _routeFunction403 = undefined;
    _routeFunction404 = undefined;
    _routing = false;
    _queue = [];
    constructor() {
        window.addEventListener("hashchange", this.CheckHash.bind(this));
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
            const paths = path.split('/');
            const cFL = paths.length;
            for (let iFL = 0; iFL < cFL; iFL++) {
                if (!paths[iFL].startsWith(':')) {
                    weight += 2 ** (cFL - iFL - 1);
                }
            }
            let regex = new RegExp('^' + path.replace(this._regexSearchVariables, function (_unused, name, type) {
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
                    default: {
                        returnValue += '\\w';
                    }
                }
                returnValue += ']+)';
                return (returnValue);
            }).replace(/\//g, '\\\/') + '$');
            const reducedPath = path.replace(this._regexSearchVariables, ':$2');
            if (!this._routes.find((route) => (reducedPath == route.path))) {
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
            const reducedPath = path.replace(this._regexSearchVariables, ':$2');
            const index = this._routes.findIndex((route) => (reducedPath == route.path));
            if (-1 < index) {
                this._routes.splice(index, 1);
                returnValue = true;
            }
        }
        return returnValue;
    }
    Trigger(path) {
        if ('#' + path != window.location.hash) {
            window.location.hash = '#' + path;
        }
    }
    async Route(path) {
        this._routing = true;
        let routeFunction = undefined;
        let routePath = '';
        let result = null;
        for (const route of this._routes) {
            if ((result = route.match.exec(path))) {
                routePath = route.path;
                let available = true;
                if (route.available) {
                    available = false;
                    if ('function' === typeof route.available) {
                        if ('AsyncFunction' === route.available.constructor.name) {
                            available = await route.available(routePath, path, (result.groups ?? {}));
                        }
                        else {
                            available = route.available(routePath, path, (result.groups ?? {}));
                        }
                    }
                }
                if (available) {
                    routeFunction = route.routeFunction;
                }
                else if (route.routeFunction403) {
                    routeFunction = route.routeFunction403;
                }
                else if (this._routeFunction403) {
                    routeFunction = this._routeFunction403;
                }
                break;
            }
        }
        if (!routeFunction || ('function' !== typeof routeFunction)) {
            if (this._routeFunction404) {
                routeFunction = this._routeFunction404;
            }
        }
        if (routeFunction && ('function' === typeof routeFunction)) {
            if ('AsyncFunction' === routeFunction.constructor.name) {
                await routeFunction(routePath, path, (result?.groups ?? {}));
            }
            else {
                routeFunction(routePath, path, (result?.groups ?? {}));
            }
        }
        if (this._queue.length) {
            await this.Route(this._queue.shift());
        }
        else {
            this._routing = false;
        }
    }
    async CheckHash() {
        let hash = (window.location.hash.startsWith('#') ? window.location.hash.substring(1) : '');
        if ('' != hash) {
            if (this._routing) {
                this._queue.push(hash);
            }
            else {
                await this.Route(hash);
            }
        }
    }
}
export default jDamnSmallRouter._GetDamnSmallRouter;
