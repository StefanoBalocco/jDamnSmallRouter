type Undefinedable<T> = T | undefined;
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
    private _routeSpecialFunction;
    private _routing;
    private _queue;
    private _characterClasses;
    private constructor();
    static GetInstance(): jDamnSmallRouter;
    private static _checkRouteEquivalence;
    RouteSpecialAdd(code: number, routeFunction: RouteFunction): boolean;
    RouteAdd(path: string, routeFunction: RouteFunction, available?: CheckAvailability, routeFunction403?: RouteFunction): boolean;
    RouteDel(path: string): boolean;
    Trigger(path: Undefinedable<string>): Promise<boolean>;
    Route(path: string): Promise<boolean>;
    CheckHash(): Promise<boolean>;
    private _getHash;
}
declare const _default: typeof jDamnSmallRouter.GetInstance;
export default _default;
