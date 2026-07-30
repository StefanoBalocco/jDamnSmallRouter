# jDamnSmallRouter

A small JavaScript/TypeScript library for hash-based URL routing (`#`). It supports routes with parameters, special error routes (403, 404, 500), and asynchronous functions. The default export is the singleton router instance.

## Installation

**npm / bundler:**

```sh
npm install @stefanobalocco/jdamnsmallmrouter
```

**Browser (CDN):**

```html
<script type="module">
	import router from 'https://cdn.jsdelivr.net/npm/@stefanobalocco/jdamnsmallmrouter/dist/jDamnSmallRouter.min.js';

	router.routeAdd( '/home', async ( routePath, hashPath, params ) => {
		console.log( 'Home page' );
	} );
</script>
```

## Quick Start

```typescript
import router from '@stefanobalocco/jdamnsmallmrouter';

router.routeAdd( '/home', async () => {
	console.log( 'Home page' );
} );

router.routeSpecialAdd( 404, async ( routePath, hashPath ) => {
	console.warn( 'Not found:', routePath, hashPath );
} );
```

## API Reference

### `router.routeSpecialAdd(code: number, routeFunction: RouteFunction): boolean`

Adds a callback function to handle special routes like 403 (Forbidden) or 404 (Not Found).

* `code`: The status code to handle (supports `403`, `404`, and `500`). Any other code throws a `RangeError`.

* `routeFunction`: The function to execute when the error occurs. It must conform to the `RouteFunction` type (`(routePath: string, hashPath: string, params?: { [ key: string ]: string }) => ( void | Promise<void> )`).

* Returns `true` if the code is supported and the function was added successfully.

* Throws a `RangeError` if the code is not 403, 404, or 500.

### `router.routeAdd(path: string, routeFunction: RouteFunction, available?: CheckAvailability, routeFunction403?: RouteFunction): boolean`

Adds a new route to the router.

* `path`: The path string to match against (see [Path Syntax](#path-syntax)).

* `routeFunction`: The function to execute when the path matches. It must conform to the `RouteFunction` type.

* `available` (optional): A function to check if the route is available. It must conform to the `CheckAvailability` type (`(routePath: string, hashPath: string, params?: { [ key: string ]: string }) => ( boolean | Promise<boolean> )`). If this function returns `false` (or a Promise resolving to `false`), the main `routeFunction` will *not* be executed.

* `routeFunction403` (optional): A function specific to this route to execute if the `available` check fails (returns `false`). This takes precedence over the global 403 function defined with `routeSpecialAdd`. It must conform to the `RouteFunction` type.

* Returns `true` if the route was added successfully, `false` if a route with the same "reduced path" (path with typed parameters normalized) already exists.

* Throws a `SyntaxError` if the path contains duplicate parameter IDs (e.g., `/users/:id/orders/:id`).

Routes are sorted based on a calculated "weight": routes with more static segments have a higher weight and are checked first.

### `router.routeDel(path: string): boolean`

Removes a previously added route.

* `path`: The path string to remove. Removes the first registered route equivalent to the supplied normalized path. An untyped parameter path (defaulting to `AZ09`) may therefore select a registered typed route with an overlapping parameter class (`AZ` or `09`).

* Returns `true` if the route was found and removed, `false` otherwise.

* Throws a `SyntaxError` if the path contains duplicate parameter IDs (for consistency with `routeAdd`).

### `router.trigger(path: string): void`

Changes the URL hash in the browser window. The browser fires a `hashchange` event that the router's `checkHash` handler picks up and routes. Equivalent to setting `window.location.hash = '#' + path;` when the path differs from the current hash.

* `path`: The path string to navigate to (without the '#').

### `router.route(path: string): Promise<void>`

Performs the route matching logic and callback function execution. Called automatically by `checkHash` on `hashchange` events. You should not need to call this directly unless you want to force routing for a specific path without changing the URL hash.

Direct `route()` calls execute immediately, not through the queue. Multiple direct calls may run concurrently; they do not wait for one another.

* `path`: The path string to match against (without the '#').

### `router.checkHash(): Promise<void>`

Bound to the window's `hashchange` event. It executes automatically whenever the URL hash changes. It reads the current hash and invokes `router.route()` only when the hash is nonempty. If routing is already in progress (e.g., an async route handler is pending), the hash is queued and processed after the current route completes.

## Path Syntax

Route paths can contain static segments and dynamic parameters.

* **Static Segments:** Any part of the path that does not start with `:`. Static segments form part of a regular expression — characters with special regex meaning (e.g., `.`) match as regex metacharacters. For example, `/a.b` matches both `/a.b` and `/axb`.

* **Dynamic Parameters:** Start with `:` followed by a name (e.g., `:id`). They can include type hints in square brackets.

  * `/:name` and `/:name[AZ09]`: Matches one or more characters in the set `a-zA-Z0-9`. E.g., `/users/:username`.

  * `/:name[09]`: Matches one or more digits (`\d`). E.g., `/products/:id[09]`.

  * `/:name[AZ]`: Matches one or more characters in the set `a-zA-Z`. E.g., `/language/:code[AZ]`.

Example path: `/blog/:year[09]/:month[09]/:slug`. This would match `/blog/2023/10/myArticle`.

**Restriction:** You cannot use the same parameter ID multiple times within the same path (e.g., `/users/:id/orders/:id` throws a `SyntaxError`).

## Parameters of RouteFunction and CheckAvailability

The `routeFunction`, `available`, and `routeFunction403` functions receive three arguments:

1. `routePath: string`: The registered path in its normalized form — parameter names are discarded and retained parameter classes are represented (e.g., `/users/:id[09]` becomes `/users/:09`, and `/users/:id` becomes `/users/:AZ09`). Useful for identifying which route matched.

2. `hashPath: string`: The actual path string from the URL hash (without the '#'). This is the path that was matched against.

3. `params?: { [ key: string ]: string }`: An object containing the values extracted from the dynamic path parameters. Keys are the parameter names defined in the path (e.g., `id`), values are the corresponding strings from the `hashPath`.

Example with `/users/:id[09]` and URL `#/users/123`:

* `routePath`: `/users/:09`

* `hashPath`: `/users/123`

* `params`: `{ id: "123" }`

## Special Routes (403, 404, and 500)

You can define handlers for common errors:

* **404 Not Found:** The function registered with `routeSpecialAdd(404, ...)` is called if no route matches the URL hash, or if a matched route's `available` function returns `false` and no callable 403 handler (route-specific or global) exists.

* **403 Forbidden:** A 403 function is called if a route matches, but its `available` function returns `false`. The precedence for the 403 function is:

  1. The `routeFunction403` defined specifically for the route that matched (if truthy).

  2. The global 403 function defined with `routeSpecialAdd(403, ...)` (if set).

* **500 Error:** A 500 function registered with `routeSpecialAdd(500, ...)` is called when no callable handler could be resolved: no route matches and no callable 404 handler exists, or the matched route's `available` check denied and neither a route-specific nor a global callable 403 handler exists and no callable 404 handler exists.

## Async Functions

`routeFunction`, `available`, and `routeFunction403` can be asynchronous functions (`async`). The router awaits every callback result regardless of whether the function is declared `async`. A non-async callback that returns a `Promise` is also awaited.

## Routing Queue

`checkHash()` queues hash changes while `_routing` is true. The `route()` method drains that queue recursively when it reaches its drain step, ensuring no hash change is lost.

Direct calls to `route()` execute immediately and may run concurrently with other `route()` calls. They are not added to the queue and do not wait for one another.
