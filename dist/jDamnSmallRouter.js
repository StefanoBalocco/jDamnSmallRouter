class jDamnSmallRouter {
    static _instance;
    _window;
    _regexDuplicatePathId = /\/(:\w+)(?:\[(?:09|AZ|AZ09)])?\/(?:.+\/)?(\1)(?:\[(?:09|AZ|AZ09)])?(?:\/|$)/g;
    _regexSearchVariables = /(?<=^|\/):(\w+)(?:\[(09|AZ|AZ09)])?(?=\/|$)/g;
    _routes = [];
    _routeFunction403;
    _routeFunction404;
    _routeFunction500;
    _routing = false;
    _queue = [];
    _characterClasses = {
        '09': '\\d',
        'AZ': 'a-zA-Z',
        'AZ09': 'a-zA-Z\\d'
    };
    constructor(window) {
        this._window = window;
        this._window.addEventListener('hashchange', this.checkHash.bind(this));
    }
    static get instance() {
        return jDamnSmallRouter._instance ??= new jDamnSmallRouter(window);
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
    routeSpecialAdd(code, routeFunction) {
        let returnValue = false;
        switch (code) {
            case 403:
                this._routeFunction403 = routeFunction;
                returnValue = true;
                break;
            case 404:
                this._routeFunction404 = routeFunction;
                returnValue = true;
                break;
            case 500:
                this._routeFunction500 = routeFunction;
                returnValue = true;
                break;
            default:
                throw new RangeError();
        }
        return returnValue;
    }
    routeAdd(path, routeFunction, available, routeFunction403) {
        let returnValue = false;
        if (path.match(this._regexDuplicatePathId)) {
            throw new SyntaxError('Duplicate path id');
        }
        else {
            const regex = new RegExp('^' + path.replace(this._regexSearchVariables, (_match, name, type) => {
                const characterClass = this._characterClasses[type ?? 'AZ09'];
                return `(?<${name}>[${characterClass}]+)`;
            }).replace(/\//g, '\\/') + '$');
            const reducedPath = path.replaceAll(this._regexSearchVariables, (_, __, component) => `:${component ?? 'AZ09'}`);
            const paths = path.split('/');
            const cL1 = paths.length;
            let weight = 0;
            for (let iL1 = 0; iL1 < cL1; iL1++) {
                if (!paths[iL1].startsWith(':')) {
                    weight += 2 ** (cL1 - iL1 - 1);
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
    routeDel(path) {
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
        }
        return returnValue;
    }
    trigger(path) {
        if (path !== this._getHash()) {
            this._window.location.hash = '#' + path;
        }
    }
    async checkHash() {
        const hash = this._getHash();
        if (hash) {
            if (this._routing) {
                this._queue.push(hash);
            }
            else {
                await this.route(hash);
            }
        }
    }
    async route(path) {
        this._routing = true;
        let routePath = '';
        let routeFunction;
        let params = {};
        const route = this._routes.find((r) => !!r.match.exec(path));
        if (route) {
            const execResult = route.match.exec(path);
            params = (execResult?.groups ?? {});
            routePath = route.path;
        }
        if (route) {
            let available = true;
            if (route.available) {
                if ('function' === typeof route.available) {
                    available = await route.available(routePath, path, params);
                }
                else {
                    available = false;
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
        }
        if (!routeFunction && this._routeFunction404) {
            routeFunction = this._routeFunction404;
        }
        if (('function' !== typeof routeFunction) && this._routeFunction500) {
            routeFunction = this._routeFunction500;
        }
        if (routeFunction && ('function' === typeof routeFunction)) {
            await routeFunction(routePath, path, params);
        }
        if (this._queue.length) {
            await this.route(this._queue.shift());
        }
        else {
            this._routing = false;
        }
    }
    _getHash() {
        return this._window.location.hash.substring(1);
    }
}
export default jDamnSmallRouter.instance;
//# sourceMappingURL=jDamnSmallRouter.js.map