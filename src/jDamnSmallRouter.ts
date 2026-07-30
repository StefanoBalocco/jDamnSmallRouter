type Nullable<T> = T | null;
type Undefinedable<T> = T | undefined;
type Promisable<T> = T | Promise<T>;

export type CheckAvailability = ( routePath: string, hashPath: string, params?: { [ key: string ]: string } ) => Promisable<boolean>;
export type RouteFunction = ( routePath: string, hashPath: string, params?: { [ key: string ]: string } ) => Promisable<void>;
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
	private _window: Window;
	private _regexDuplicatePathId: RegExp = /\/(:\w+)(?:\[(?:09|AZ|AZ09)])?\/(?:.+\/)?(\1)(?:\[(?:09|AZ|AZ09)])?(?:\/|$)/g;
	private _regexSearchVariables: RegExp = /(?<=^|\/):(\w+)(?:\[(09|AZ|AZ09)])?(?=\/|$)/g;
	private _routes: Route[] = [];
	private _routeFunction403: Undefinedable<RouteFunction>;
	private _routeFunction404: Undefinedable<RouteFunction>;
	private _routeFunction500: Undefinedable<RouteFunction>;
	private _routing: boolean = false;
	private _queue: string[] = [];

	private _characterClasses: Record<string, string> = {
		'09': '\\d',
		'AZ': 'a-zA-Z',
		'AZ09': 'a-zA-Z\\d'
	};

	private constructor( window: Window ) {
		this._window = window;
		this._window.addEventListener( 'hashchange', this.checkHash.bind( this ) );
	}

	public static get instance(): jDamnSmallRouter {
		return jDamnSmallRouter._instance ??= new jDamnSmallRouter( window );
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
		return [ ...generateVariants( path2 ) ].some( ( x: string ): boolean => variants.has( x ) );
	}

	public routeSpecialAdd( code: number, routeFunction: RouteFunction ): boolean {
		let returnValue: boolean = false;
		switch( code ) {
			case 403:
				this._routeFunction403 = routeFunction;
				returnValue = true;
				break;
			case 404:
				this._routeFunction404 = routeFunction;
				returnValue = true;
				break;
			case 500:
				this._routeFunction500 = routeFunction;
				returnValue = true;
				break;
			default:
				throw new RangeError();
		}
		return returnValue;
	}

	public routeAdd( path: string, routeFunction: RouteFunction, available?: CheckAvailability, routeFunction403?: RouteFunction ): boolean {
		let returnValue: boolean = false;
		if( path.match( this._regexDuplicatePathId ) ) {
			throw new SyntaxError( 'Duplicate path id' );
		} else {
			const regex: RegExp = new RegExp( '^' + path.replace(
				this._regexSearchVariables,
				( _match: string, name: string, type: Undefinedable<string> ): string => {
					const characterClass: string = this._characterClasses[ type ?? 'AZ09' ];
					return `(?<${ name }>[${ characterClass }]+)`;
				}
			).replace( /\//g, '\\/' ) + '$' );
			const reducedPath: string = path.replaceAll(
				this._regexSearchVariables,
				( _: string, __: string, component: Undefinedable<string> ): string => `:${ component ?? 'AZ09' }`
			);
			const paths: string[] = path.split( '/' );
			const cL1: number = paths.length;
			let weight: number = 0;
			for( let iL1: number = 0; iL1 < cL1; iL1++ ) {
				if( !paths[ iL1 ].startsWith( ':' ) ) {
					weight += 2 ** ( cL1 - iL1 - 1 );
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

	public routeDel( path: string ): boolean {
		let returnValue: boolean = false;
		if( path.match( this._regexDuplicatePathId ) ) {
			throw new SyntaxError( 'Duplicate path id' );
		} else {
			const reducedPath: string = path.replaceAll(
				this._regexSearchVariables,
				( _: string, __: string, component: Undefinedable<string> ): string => `:${ component ?? 'AZ09' }`
			);
			const index: number = this._routes.findIndex( ( route: Route ): boolean => jDamnSmallRouter._checkRouteEquivalence( reducedPath, route.path ) );
			if( -1 < index ) {
				this._routes.splice( index, 1 );
				returnValue = true;
			}
		}
		return returnValue;
	}

	public trigger( path: string ): void {
		if( path !== this._getHash() ) {
			this._window.location.hash = '#' + path;
		}
	}

	public async checkHash(): Promise<void> {
		const hash: string = this._getHash();
		if( hash ) {
			if( this._routing ) {
				this._queue.push( hash );
			} else {
				await this.route( hash );
			}
		}
	}

	public async route( path: string ): Promise<void> {
		this._routing = true;

		let routePath: string = '';
		let routeFunction: Undefinedable<RouteFunction>;
		let params: Record<string, string> = {};

		const route: Undefinedable<Route> = this._routes.find(
			( r: Route ): boolean => !!r.match.exec( path )
		);

		if( route ) {
			const execResult: Nullable<RegExpExecArray> = route.match.exec( path );
			params = ( execResult?.groups ?? {} ) as Record<string, string>;
			routePath = route.path;
		}

		if( route ) {
			let available: boolean = true;
			if( route.available ) {
				if( 'function' === typeof route.available ) {
					available = await route.available( routePath, path, params );
				} else {
					available = false;
				}
			}

			if( available ) {
				routeFunction = route.routeFunction;
			} else if( route.routeFunction403 ) {
				routeFunction = route.routeFunction403;
			} else if( this._routeFunction403 ) {
				routeFunction = this._routeFunction403;
			}
		}

		if( !routeFunction && this._routeFunction404 ) {
			routeFunction = this._routeFunction404;
		}

		if( ( 'function' !== typeof routeFunction ) && this._routeFunction500 ) {
			routeFunction = this._routeFunction500;
		}

		if( routeFunction && ( 'function' === typeof routeFunction ) ) {
			await routeFunction( routePath, path, params );
		}

		if( this._queue.length ) {
			await this.route( this._queue.shift()! );
		} else {
			this._routing = false;
		}
	}

	private _getHash(): string {
		return this._window.location.hash.substring( 1 );
	}
}

export default jDamnSmallRouter.instance;
