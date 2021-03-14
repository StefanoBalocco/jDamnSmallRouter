'use strict';
var jDamnSmallRouter;
(function (jDamnSmallRouter) {
    function Create() {
        return new Router();
    }
    jDamnSmallRouter.Create = Create;
    class Router {
        constructor() {
            this._regexDuplicatePathId = new RegExp(/(:[\w]+)(?:\[(09|AZ)])\/(.+\/)?\1?/g);
            this._regexSearchVariables = new RegExp(/(?<=^|\/):([\w]+)(?:\[(09|AZ)])?(?=\/|$)/g);
            this._routes = [];
            this._routeFunction403 = undefined;
            this._routeFunction404 = undefined;
            window.addEventListener("hashchange", this.HashChanged);
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
            if (!path.match(this._regexDuplicatePathId)) {
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
        async HashChanged() {
            let hash = (window.location.hash.startsWith('#') ? window.location.hash.substr(1) : '');
            let routeFunction = undefined;
            let path = '';
            for (const route of this._routes) {
                if (route.match.exec(hash)) {
                    path = route.path;
                    let available = true;
                    if (route.available) {
                        available = false;
                        if ('function' === typeof route.available) {
                            if ('AsyncFunction' === route.available.constructor.name) {
                                available = await route.available(route.path, hash);
                            }
                            else {
                                available = route.available(route.path, hash);
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
                    await routeFunction(path, hash);
                }
                else {
                    routeFunction(path, hash);
                }
            }
        }
    }
})(jDamnSmallRouter || (jDamnSmallRouter = {}));
