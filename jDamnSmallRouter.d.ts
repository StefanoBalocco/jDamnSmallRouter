type Promisable<T> = Promise<T>;
export type CheckAvailability = (path: string, hashPath: string, params?: {
    [key: string]: string;
}) => Promisable<boolean>;
export type RouteFunction = (path: string, hashPath: string, params?: {
    [key: string]: string;
}) => Promisable<void>;
export type Route = {
    path: string;
    match: RegExp;
    weight: number;
    routeFunction: RouteFunction;
    available?: CheckAvailability;
    routeFunction403?: RouteFunction;
};
declare class jDamnSmallRouter {
    private static _instance;
    static _getDamnSmallRouter(): jDamnSmallRouter;
    private static _checkRouteEquivalence;
    private _regexDuplicatePathId;
    private _regexSearchVariables;
    private _routes;
    private _routeFunction403;
    private _routeFunction404;
    private _routing;
    private _queue;
    private _window;
    private _location;
    private constructor();
    RouteSpecialAdd(code: number, routeFunction: RouteFunction): boolean;
    RouteAdd(path: string, routeFunction: RouteFunction, available?: CheckAvailability, routeFunction403?: RouteFunction): boolean;
    RouteDel(path: string): boolean;
    Trigger(path: string): void;
    Route(path: string): Promise<boolean>;
    CheckHash(): Promise<void>;
}
declare const _default: typeof jDamnSmallRouter._getDamnSmallRouter;
export default _default;
