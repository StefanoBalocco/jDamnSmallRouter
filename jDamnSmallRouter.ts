'use strict';

type Undefinedable<T> = T | undefined;
type Nullable<T> = T | null;
type Promisable<T> = T | Promise<T>;

export type CheckAvailability = ( routePath: string, hashPath: string, params?: { [ key: string ]: string } ) => Promisable<boolean>;
export type RouteFunction = ( routePath: Undefinedable<string>, hashPath: string, params?: { [ key: string ]: string } ) => Promisable<void>;
export type Route = {
	path: string,
	match: RegExp,
	weight: number,
	routeFunction: RouteFunction,
	available?: CheckAvailability,
	routeFunction403?: RouteFunction
};

class jDamnSmallRouter {
	private static _instance: Undefinedable<jDamnSmallRouter>;

	public static _getDamnSmallRouter(): jDamnSmallRouter {
		if( undefined === jDamnSmallRouter._instance ) {
			jDamnSmallRouter._instance = new jDamnSmallRouter();
		}
		return jDamnSmallRouter._instance;
	}

	private static _checkRouteEquivalence( path1: string, path2: string ): boolean {
		const generateVariants: ( path: string ) => string[] = ( path: string ): string[ ] => {
			let returnValue: string[ ] = [ path ];
			if( path.includes( ':AZ09' ) ) {
				returnValue.push(
					...generateVariants( path.replace( /:AZ09/, ':AZ' ) ),
					...generateVariants( path.replace( /:AZ09/, ':09' ) )
				);
			}
			return returnValue;
		};
		const variants: Set<string> = new Set( generateVariants( path1 ) );
		return [ ...generateVariants( path2 ) ].some( ( x: string ) => variants.has( x ) );
	}

	private _regexDuplicatePathId: RegExp = new RegExp( /\/(:\w+)\[(?:09|AZ)]\/(?:.+\/)?(\1)(?:\[(?:09|AZ)]|\/|$)/g );
	private _regexSearchVariables: RegExp = new RegExp( /(?<=^|\/):(\w+)(?:\[(09|AZ)])?(?=\/|$)/g );
	private _routes: Route[] = [];
	private _routeFunction403: Undefinedable<RouteFunction>;
	private _routeFunction404: Undefinedable<RouteFunction>;
	private _routeFunction500: Undefinedable<RouteFunction>;
	private _routing: boolean = false;
	private _queue: string[] = [];
	private _window: Window = window;
	private _location: Location = this._window.location;

	private constructor() {
		this._window.addEventListener( 'hashchange', this.CheckHash.bind( this ) );
	}

	private _getHash(): string {
		return this._location.hash.substring( 1 );
	}

	public RouteSpecialAdd( code: number, routeFunction: RouteFunction ): boolean {
		let returnValue: boolean = false;
		switch( code ) {
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
			case 500: {
				this._routeFunction500 = routeFunction;
				returnValue = true;
				break;
			}
			default: {
				throw new RangeError();
			}
		}
		return returnValue;
	}

	public RouteAdd( path: string, routeFunction: RouteFunction, available?: CheckAvailability, routeFunction403?: RouteFunction ): boolean {
		let returnValue: boolean = false;
		if( path.match( this._regexDuplicatePathId ) ) {
			throw new SyntaxError( 'Duplicate path id' );
		} else {
			let weight: number = 0;
			let regex: RegExp = new RegExp( '^' + path.replace( this._regexSearchVariables,
				function( _: string, name: string, type: string ): string {
					let returnValue = '(?<' + name + '>[';
					switch( type ) {
						case '09': {
							returnValue += '\\d';
							break;
						}
						case 'AZ': {
							returnValue += 'a-zA-Z';
							break;
						}
						case 'AZ09':
						default: {
							returnValue += 'a-zA-Z\\d';
						}
					}
					returnValue += ']+)';
					return returnValue;
				} ).replace( /\//g, '\\\/' ) + '$' );
			const reducedPath: string = path.replace(
				this._regexSearchVariables,
				( _: string, __: any, component: any ): string => `:${ component ?? 'AZ09' }`
			);
			const paths: string[] = path.split( '/' );
			const cFL: number = paths.length;
			for( let iFL: number = 0; iFL < cFL; iFL++ ) {
				if( !paths[ iFL ].startsWith( ':' ) ) {
					weight += 2 ** ( cFL - iFL - 1 );
				}
			}
			if( !this._routes.find( ( route: Route ): boolean => jDamnSmallRouter._checkRouteEquivalence( reducedPath, route.path ) ) ) {
				this._routes.push( {
					path: reducedPath,
					match: regex,
					weight: weight,
					routeFunction: routeFunction,
					available: available,
					routeFunction403: routeFunction403
				} );
				this._routes.sort(
					( a: Route, b: Route ): number => ( ( a.weight > b.weight ) ? -1 : ( ( b.weight > a.weight ) ? 1 : 0 ) )
				);
				returnValue = true;
			}
		}
		return returnValue;
	}

	public RouteDel( path: string ): boolean {
		let returnValue: boolean = false;
		if( path.match( this._regexDuplicatePathId ) ) {
			throw new SyntaxError( 'Duplicate path id' );
		} else {
			const reducedPath: string = path.replace(
				this._regexSearchVariables,
				( _: string, __: any, component: any ): string => `:${ component ?? 'AZ09' }`
			);
			const index: number = this._routes.findIndex( ( route: Route ): boolean => jDamnSmallRouter._checkRouteEquivalence( reducedPath, route.path ) );
			if( -1 < index ) {
				this._routes.splice( index, 1 );
				returnValue = true;
			}
		}
		return returnValue;
	}

	public async Trigger( path: Undefinedable<string> ): Promise<boolean> {
		if( ( undefined !== path ) && ( path != this._getHash() ) ) {
			this._location.hash = '#' + path;
		}
		return await this.CheckHash();
	}

	public async Route( path: string ): Promise<boolean> {
		let returnValue: boolean = true;
		this._queue.push( path );
		if( this._routing ) {
			returnValue = false;
		} else {
			this._routing = true;
			while( path = this._queue.shift()! ) {
				let routePath: Undefinedable<string>;
				let routeFunction: Undefinedable<RouteFunction>;
				let match: Undefinedable<Nullable<RegExpExecArray>>;
				const route: Route = this._routes.reduce( ( selectedRoute: Route, currentRoute: Route ): Route => {
					let returnValue: Route = selectedRoute;
					if( currentRoute.weight > selectedRoute.weight ) {
						let tmpValue: Nullable<RegExpExecArray> = currentRoute.match.exec( path );
						if( tmpValue ) {
							returnValue = currentRoute;
							match = tmpValue;
						}
					}
					return returnValue;
				} );
				if( route ) {
					if( match ) {
						routePath = route.path;
						let available: boolean = route.available ? ( ( 'function' === typeof route.available ) && await route.available( routePath, path, ( match.groups ?? {} ) ) ) : true;
						routeFunction = ( available ? route.routeFunction : ( route.routeFunction403 ?? this._routeFunction403 ) );
						if( ( 'function' !== typeof routeFunction ) ) {
							routeFunction = this._routeFunction500;
						}
					} else {
						routeFunction = this._routeFunction404;
					}
				} else {
					routeFunction = this._routeFunction404;
				}
				if( 'function' === typeof routeFunction ) {
					await routeFunction( routePath, path, ( match?.groups ?? {} ) );
				}
			}
			this._routing = false;
		}
		return returnValue;
	}

	public async CheckHash(): Promise<boolean> {
		const hash: string = this._getHash();
		return ( hash ? await this.Route( hash ) : false );
	}
}

export default jDamnSmallRouter._getDamnSmallRouter;