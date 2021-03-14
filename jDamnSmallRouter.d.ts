declare namespace jDamnSmallRouter {
    interface CheckAvailability {
        (path: string, hashPath: string): (boolean | Promise<boolean>);
    }
    interface RouteFunction {
        (path: string, hashPath: string): (void | Promise<void>);
    }
    export function Create(): Router;
    class Router {
        private _regexDuplicatePathId;
        private _regexSearchVariables;
        private _routes;
        private _routeFunction403;
        private _routeFunction404;
        constructor();
        RouteSpecialAdd(code: number, routeFunction: RouteFunction): boolean;
        RouteAdd(path: string, routeFunction: RouteFunction, available?: CheckAvailability, routeFunction403?: RouteFunction): boolean;
        RouteDel(path: string): boolean;
        private HashChanged;
    }
    export {};
}
