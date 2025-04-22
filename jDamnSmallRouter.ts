"use strict";

export type CheckAvailability = ( path: string, hashPath: string, params?: { [ key: string ]: string } ) => ( boolean | Promise<boolean> )
export type RouteFunction = ( path: string, hashPath: string, params?: { [ key: string ]: string } ) => ( void | Promise<void> )
export type Route = {
	path: string,
	match: RegExp,
	weight: number,
	routeFunction: RouteFunction,
	available?: CheckAvailability,
	routeFunction403?: RouteFunction
};

class jDamnSmallRouter {
	private static _instance: ( jDamnSmallRouter | undefined );

	public static _GetDamnSmallRouter(): jDamnSmallRouter {
		if( 'undefined' === typeof jDamnSmallRouter._instance ) {
			jDamnSmallRouter._instance = new jDamnSmallRouter();
		}
		return jDamnSmallRouter._instance;
	}

	private _regexDuplicatePathId = new RegExp( /\/(:\w+)\[(?:09|AZ)]\/(?:.+\/)?(\1)(?:\[(?:09|AZ)]|\/|$)/g );
	private _regexSearchVariables = new RegExp( /(?<=^|\/):(\w+)(?:\[(09|AZ)])?(?=\/|$)/g );
	private _routes: Route[] = [];
	private _routeFunction403: ( RouteFunction | undefined ) = undefined;
	private _routeFunction404: ( RouteFunction | undefined ) = undefined;
	private _routing: boolean = false;
	private _queue: string[] = [];

	private constructor() {
		window.addEventListener( 'hashchange', this.CheckHash.bind( this ) );
	}

	public RouteSpecialAdd( code: number, routeFunction: RouteFunction ) {
		let returnValue = false;
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
			default: {
				throw new RangeError();
			}
		}
		return returnValue;
	}

	public RouteAdd( path: string, routeFunction: RouteFunction, available?: CheckAvailability, routeFunction403?: RouteFunction ) {
		let returnValue = false;
		if( path.match( this._regexDuplicatePathId ) ) {
			throw new SyntaxError( 'Duplicate path id' );
		} else {
			let weight = 0;
			const paths = path.split( '/' );
			const cFL = paths.length;
			for( let iFL = 0; iFL < cFL; iFL++ ) {
				if( !paths[ iFL ].startsWith( ':' ) ) {
					weight += 2 ** ( cFL - iFL - 1 );
				}
			}
			let regex = new RegExp( '^' + path.replace( this._regexSearchVariables,
				function( _unused, name, type ) {
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
						default: {
							returnValue += '\\w';
						}
					}
					returnValue += ']+)';
					return ( returnValue );
				} ).replace( /\//g, '\\\/' ) + '$' );
			const reducedPath = path.replace( this._regexSearchVariables, ':$2' );
			if( !this._routes.find( ( route ) => ( reducedPath == route.path ) ) ) {
				this._routes.push( {
					path: reducedPath,
					match: regex,
					weight: weight,
					routeFunction: routeFunction,
					available: available,
					routeFunction403: routeFunction403
				} );
				this._routes.sort(
					( a, b ) => ( ( a.weight > b.weight ) ? -1 : ( ( b.weight > a.weight ) ? 1 : 0 ) )
				);
				returnValue = true;
			}
		}
		return returnValue;
	}

	public RouteDel( path: string ) {
		let returnValue = false;
		if( path.match( this._regexDuplicatePathId ) ) {
			throw new SyntaxError( 'Duplicate path id' );
		} else {
			const reducedPath = path.replace( this._regexSearchVariables, ':$2' );
			const index = this._routes.findIndex( ( route ) => ( reducedPath == route.path ) );
			if( -1 < index ) {
				this._routes.splice( index, 1 );
				returnValue = true;
			}
		}
		return returnValue;
	}

	public Trigger( path: string ) {
		if( '#' + path != window.location.hash ) {
			window.location.hash = '#' + path;
		}
	}

	public async Route( path: string ) {
		this._routing = true;
		let routeFunction: ( RouteFunction | undefined ) = undefined;
		let routePath: string = '';
		let result: ( RegExpExecArray | null ) = null;
		for( const route of this._routes ) {
			if( ( result = route.match.exec( path ) ) ) {
				routePath = route.path;
				let available: boolean = true;
				if( route.available ) {
					available = false;
					if( 'function' === typeof route.available ) {
						if( 'AsyncFunction' === route.available.constructor.name ) {
							available = await route.available( routePath, path, ( result.groups ?? {} ) );
						} else {
							// @ts-ignore
							available = route.available( routePath, path, ( result.groups ?? {} ) );
						}
					}
				}
				if( available ) {
					routeFunction = route.routeFunction;
				} else if( route.routeFunction403 ) {
					routeFunction = route.routeFunction403;
				} else if( this._routeFunction403 ) {
					routeFunction = this._routeFunction403;
				}
				break;
			}
		}
		if( !routeFunction || ( 'function' !== typeof routeFunction ) ) {
			if( this._routeFunction404 ) {
				routeFunction = this._routeFunction404;
			}
		}
		if( routeFunction && ( 'function' === typeof routeFunction ) ) {
			if( 'AsyncFunction' === routeFunction.constructor.name ) {
				await routeFunction( routePath, path, ( result?.groups ?? {} ) );
			} else {
				routeFunction( routePath, path, ( result?.groups ?? {} ) );
			}
		}
		if( this._queue.length ) {
			await this.Route( <string> this._queue.shift() );
		} else {
			this._routing = false;
		}
	}

	public async CheckHash() {
		let hash = ( window.location.hash.startsWith( '#' ) ? window.location.hash.substring( 1 ) : '' );
		if( '' != hash ) {
			if( this._routing ) {
				this._queue.push( hash );
			} else {
				await this.Route( hash );
			}
		}
	}
}

export default jDamnSmallRouter._GetDamnSmallRouter;