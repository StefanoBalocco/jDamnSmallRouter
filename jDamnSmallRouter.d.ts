export type CheckAvailability = (path: string, hashPath: string, params?: {
    [key: string]: string;
}) => (boolean | Promise<boolean>);
export type RouteFunction = (path: string, hashPath: string, params?: {
    [key: string]: string;
}) => (void | Promise<void>);
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
    static _GetDamnSmallRouter(): jDamnSmallRouter;
    private _regexDuplicatePathId;
    private _regexSearchVariables;
    private _routes;
    private _routeFunction403;
    private _routeFunction404;
    private _routing;
    private _queue;
    private constructor();
    RouteSpecialAdd(code: number, routeFunction: RouteFunction): boolean;
    RouteAdd(path: string, routeFunction: RouteFunction, available?: CheckAvailability, routeFunction403?: RouteFunction): boolean;
    RouteDel(path: string): boolean;
    Trigger(path: string): void;
    Route(path: string): Promise<void>;
    CheckHash(): Promise<void>;
}
declare const _default: typeof jDamnSmallRouter._GetDamnSmallRouter;
export default _default;
