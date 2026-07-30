type Promisable<T> = T | Promise<T>;
export type CheckAvailability = (routePath: string, hashPath: string, params?: {
    [key: string]: string;
}) => Promisable<boolean>;
export type RouteFunction = (routePath: string, hashPath: string, params?: {
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
    private _window;
    private _regexDuplicatePathId;
    private _regexSearchVariables;
    private _routes;
    private _routeFunction403;
    private _routeFunction404;
    private _routeFunction500;
    private _routing;
    private _queue;
    private _characterClasses;
    private constructor();
    static get instance(): jDamnSmallRouter;
    private static _checkRouteEquivalence;
    routeSpecialAdd(code: number, routeFunction: RouteFunction): boolean;
    routeAdd(path: string, routeFunction: RouteFunction, available?: CheckAvailability, routeFunction403?: RouteFunction): boolean;
    routeDel(path: string): boolean;
    trigger(path: string): void;
    checkHash(): Promise<void>;
    route(path: string): Promise<void>;
    private _getHash;
}
declare const _default: jDamnSmallRouter;
export default _default;
