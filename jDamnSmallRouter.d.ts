declare namespace jDamnSmallRouter {
    type CheckAvailability = (path: string, hashPath: string, params?: {
        [key: string]: string;
    }) => (boolean | Promise<boolean>);
    type RouteFunction = (path: string, hashPath: string, params?: {
        [key: string]: string;
    }) => (void | Promise<void>);
    class Router {
        private _regexDuplicatePathId;
        private _regexSearchVariables;
        private _routes;
        private _routeFunction403;
        private _routeFunction404;
        private _routing;
        private _queue;
        constructor();
        RouteSpecialAdd(code: number, routeFunction: RouteFunction): boolean;
        RouteAdd(path: string, routeFunction: RouteFunction, available?: CheckAvailability, routeFunction403?: RouteFunction): boolean;
        RouteDel(path: string): boolean;
        Trigger(path: string): void;
        Route(path: string): Promise<void>;
        CheckHash(): Promise<void>;
    }
    export function Create(): Router;
    export {};
}
