'use strict';

type Undefinedable<T> = T | undefined;
type Promisable<T> = T | Promise<T>;
//type Nullable<T> = T | null;

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
	private static _window: Window = window;
	private static _location: Location = jDamnSmallRouter._window.location;

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

	private _regexDuplicatePathId: RegExp = /\/(:\w+)\[(?:09|AZ)]\/(?:.+\/)?(\1)(?:\[(?:09|AZ)]|\/|$)/;
	private _regexSearchVariables: RegExp = /(?<=^|\/):(\w+)(?:\[(09|AZ)])?(?=\/|$)/g;
	private _routes: Route[] = [];
	private _routeSpecialFunction: RouteFunction[] = [];
	private _routing: boolean = false;
	private _queue: string[] = [];

	private constructor() {
		jDamnSmallRouter._window.addEventListener( 'hashchange', this.CheckHash.bind( this ) );
	}

	private _getHash(): string {
		return jDamnSmallRouter._location.hash.substring( 1 );
	}

	public RouteSpecialAdd( code: number, routeFunction: RouteFunction ): boolean {
		let returnValue: boolean = false;
		if( [ 403, 404, 500 ].includes( code ) ) {
			this._routeSpecialFunction[ code ] = routeFunction;
			returnValue = true;
		} else {
			throw new RangeError();
		}
		return returnValue;
	}

	public RouteAdd( path: string, routeFunction: RouteFunction, available?: CheckAvailability, routeFunction403?: RouteFunction ): boolean {
		let returnValue: boolean = false;
		if( path.match( this._regexDuplicatePathId ) ) {
			throw new SyntaxError( 'Duplicate path id' );
		} else {
			const regex: RegExp = new RegExp( '^' + path.replaceAll( this._regexSearchVariables,
				( _: string, name: string, type: string ): string => {
					const characterClass: string = {
																					 '09': '\\d',
																					 'AZ': 'a-zA-Z',
																					 'AZ09': 'a-zA-Z\\d'
																				 }[ type ] ?? 'a-zA-Z\\d';
					return `(?<${ name }>[${ characterClass }]+)`;
				} ).replace( /\//g, '\\\/' ) + '$' );
			const reducedPath: string = path.replaceAll(
				this._regexSearchVariables,
				( _: string, __: any, component: any ): string => `:${ component ?? 'AZ09' }`
			);
			const paths: string[] = path.split( '/' );
			const cFL: number = paths.length;
			let weight: number = 0;
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
					( a: Route, b: Route ): number => ( b.weight - a.weight )
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
			const reducedPath: string = path.replaceAll(
				this._regexSearchVariables,
				( _: string, __: any, component: any ): string => `:${ component ?? 'AZ09' }`
			);
			const index: number = this._routes.findIndex( ( route: Route ): boolean => jDamnSmallRouter._checkRouteEquivalence( reducedPath, route.path ) );
			if( -1 < index ) {
				this._routes.splice( index, 1 );
				returnValue = true;
			} else {
				throw new Error( 'Duplicated path' );
			}
		}
		return returnValue;
	}

	public async Trigger( path: Undefinedable<string> ): Promise<boolean> {
		if( ( undefined !== path ) && ( this._getHash() !== path ) ) {
			jDamnSmallRouter._location.hash = '#' + path;
		}
		return await this.CheckHash();
	}

	public async Route( path: string ): Promise<boolean> {
		let returnValue: boolean = false;
		this._queue.push( path );
		if( !this._routing ) {
			returnValue = true;
			this._routing = true;
			while( path = this._queue.shift()! ) {
				let routePath: Undefinedable<string>;
				let routeFunction: Undefinedable<RouteFunction>;
				let params: Record<string, string> = {};
				const route: Undefinedable<Route> = this._routes.find(
					( route: Route ): boolean => !!route.match.exec( path )
				);
				if( route ) {
					// match.exec is always not null because we already filtered all the routes with !!route.match.exec
					params = route.match.exec( path )!.groups ?? {};
					routePath = route.path;
					let available: boolean = ( route.available ? ( ( 'function' === typeof route.available ) && await route.available( routePath, path, params ) ) : true );
					routeFunction = ( available ? route.routeFunction : ( route.routeFunction403 ?? this._routeSpecialFunction[ 403 ] ) );
					if( 'function' !== typeof routeFunction ) {
						routeFunction = this._routeSpecialFunction[ 500 ];
					}
				} else {
					routeFunction = this._routeSpecialFunction[ 404 ];
				}
				if( 'function' === typeof routeFunction ) {
					await routeFunction( routePath, path, params );
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