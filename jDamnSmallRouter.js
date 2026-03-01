class jDamnSmallRouter {
    static _instance;
    _window;
    _regexDuplicatePathId = /\/(:\w+)(?:\[(?:09|AZ|AZ09)])?\/(?:.+\/)?(\1)(?:\[(?:09|AZ|AZ09)])?(?:\/|$)/g;
    _regexSearchVariables = /(?<=^|\/):(\w+)(?:\[(09|AZ)])?(?=\/|$)/g;
    _routes = [];
    _routeSpecialFunction = [];
    _routing = false;
    _queue = [];
    _characterClasses = {
        '09': '\\d',
        'AZ': 'a-zA-Z',
        'AZ09': 'a-zA-Z\\d'
    };
    constructor(window) {
        this._window = window;
        this._window.addEventListener('hashchange', this.CheckHash.bind(this));
    }
    static GetInstance() {
        if (undefined === jDamnSmallRouter._instance) {
            jDamnSmallRouter._instance = new jDamnSmallRouter(window);
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
    RouteSpecialAdd(code, routeFunction) {
        let returnValue = false;
        if ([403, 404, 500].includes(code)) {
            this._routeSpecialFunction[code] = routeFunction;
            returnValue = true;
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
                const characterClass = this._characterClasses[type] ?? this._characterClasses['AZ09'];
                return `(?<${name}>[${characterClass}]+)`;
            }) + '$');
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
        }
        return returnValue;
    }
    Trigger(path) {
        if ((undefined !== path) && (this._getHash() !== path)) {
            this._window.location.hash = '#' + path;
        }
        return this.CheckHash();
    }
    async Route(path) {
        let returnValue = false;
        this._queue.push(path);
        if (!this._routing) {
            returnValue = true;
            this._routing = true;
            while (this._queue.length) {
                path = this._queue.shift();
                let routePath = '';
                let routeFunction;
                let params = {};
                const route = this._routes.find((route) => !!route.match.exec(path));
                if (route) {
                    params = route.match.exec(path).groups ?? {};
                    routePath = route.path;
                    const available = (route.available ? (('function' === typeof route.available) && await route.available(routePath, path, params)) : true);
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
        return (hash ? this.Route(hash) : false);
    }
    _getHash() {
        return this._window.location.hash.substring(1);
    }
}
export default jDamnSmallRouter.GetInstance;
