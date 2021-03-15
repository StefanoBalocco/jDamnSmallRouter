'use strict';

namespace jDamnSmallRouter {
	interface CheckAvailability {
		( path: string, hashPath: string ): ( boolean | Promise<boolean> )
	}

	interface RouteFunction {
		( path: string, hashPath: string ): ( void | Promise<void> )
	}

	type Route = {
		path: string,
		match: RegExp,
		weight: number,
		routeFunction: RouteFunction,
		available?: CheckAvailability,
		routeFunction403?: RouteFunction
	};

	export function Create(): Router {
		return new Router();
	}

	class Router {
		private _regexDuplicatePathId = new RegExp( /(:[\w]+)(?:\[(09|AZ)])\/(.+\/)?\1?/g );
		private _regexSearchVariables = new RegExp( /(?<=^|\/):([\w]+)(?:\[(09|AZ)])?(?=\/|$)/g );
		private _routes: Route[] = [];
		private _routeFunction403: ( RouteFunction | undefined ) = undefined;
		private _routeFunction404: ( RouteFunction | undefined ) = undefined;

		public constructor() {
			window.addEventListener( "hashchange", this.CheckHash );
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
			if( !path.match( this._regexDuplicatePathId ) ) {
				throw new SyntaxError( 'Duplicate path id' );
			} else {
				let weight = 0;
				const paths = path.split( '/' );
				const tmpCountFirstLevel = paths.length;
				for( let indexFirstLevel = 0; indexFirstLevel < tmpCountFirstLevel; indexFirstLevel++ ) {
					if( !paths[ indexFirstLevel ].startsWith( ':' ) ) {
						weight += 2 ^ ( tmpCountFirstLevel - indexFirstLevel - 1 );
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
			if( !path.match( this._regexDuplicatePathId ) ) {
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

		public async Trigger( path: string ) {
			if( '#' + path != window.location.hash ) {
				window.location.hash = '#' + path;
			}
			let routeFunction: ( RouteFunction | undefined ) = undefined;
			let routePath: string = '';
			for( const route of this._routes ) {
				if( route.match.exec( path ) ) {
					routePath = route.path;
					let available: boolean = true;
					if( route.available ) {
						available = false;
						if( 'function' === typeof route.available ) {
							if( 'AsyncFunction' === route.available.constructor.name ) {
								available = await route.available( routePath, path );
							} else {
								// @ts-ignore
								available = route.available( routePath, path );
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
					await routeFunction( routePath, path );
				} else {
					routeFunction( routePath, path );
				}
			}
		}

		public async CheckHash() {
			return this.Trigger( ( window.location.hash.startsWith( '#' ) ? window.location.hash.substr( 1 ) : '' ) );
		}
	}
}