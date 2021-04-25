'use strict';
var jDamnSmallRouter;
(function (jDamnSmallRouter) {
    function Create() {
        return new Router();
    }
    jDamnSmallRouter.Create = Create;
    class Router {
        constructor() {
            this._regexDuplicatePathId = new RegExp(/\/(:[\w]+)(?:\[(?:09|AZ)])\/(?:.+\/)?(\1)(?:(?:\[(?:09|AZ)])|\/|$)/g);
            this._regexSearchVariables = new RegExp(/(?<=^|\/):([\w]+)(?:\[(09|AZ)])?(?=\/|$)/g);
            this._routes = [];
            this._routeFunction403 = undefined;
            this._routeFunction404 = undefined;
            this._routing = false;
            this._queue = [];
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
                const tmpCountFirstLevel = paths.length;
                for (let indexFirstLevel = 0; indexFirstLevel < tmpCountFirstLevel; indexFirstLevel++) {
                    if (!paths[indexFirstLevel].startsWith(':')) {
                        weight += 2 ^ (tmpCountFirstLevel - indexFirstLevel - 1);
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
            if (!path.match(this._regexDuplicatePathId)) {
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
            var _a, _b, _c, _d;
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
                                available = await route.available(routePath, path, ((_a = result.groups) !== null && _a !== void 0 ? _a : {}));
                            }
                            else {
                                available = route.available(routePath, path, ((_b = result.groups) !== null && _b !== void 0 ? _b : {}));
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
                    await routeFunction(routePath, path, ((_c = result === null || result === void 0 ? void 0 : result.groups) !== null && _c !== void 0 ? _c : {}));
                }
                else {
                    routeFunction(routePath, path, ((_d = result === null || result === void 0 ? void 0 : result.groups) !== null && _d !== void 0 ? _d : {}));
                }
            }
            if (this._queue.length) {
                this.Route(this._queue.shift());
            }
            else {
                this._routing = false;
            }
        }
        async CheckHash() {
            let hash = (window.location.hash.startsWith('#') ? window.location.hash.substr(1) : '');
            if ('' != hash) {
                if (this._routing) {
                    this._queue.push(hash);
                }
                else {
                    this.Route(hash);
                }
            }
        }
    }
})(jDamnSmallRouter || (jDamnSmallRouter = {}));
