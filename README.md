# jDamnSmallRouter

A small JavaScript/TypeScript library for hash-based URL routing (`#`). It supports routes with parameters, special error routes (403, 404), and asynchronous functions. It implements a singleton pattern to ensure a single router instance.

## Basic Usage

To get started, obtain the unique router instance:

```
import jDamnSmallRouter from 'https://cdn.jsdelivr.net/gh/StefanoBalocco/jDamnSmallRouter/jDamnSmallRouter.min.js';
const router = jDamnSmallRouter();
```

Once you have the instance, you can add routes and trigger navigation.

```
// Add a simple route
router.RouteAdd('/home', async (registeredPath, actualPath, params) => {
console.log('You are on the home page!');
console.log('Registered Path:', registeredPath); // E.g., /home
console.log('Actual Path:', actualPath);       // E.g., /home
console.log('Parameters:', params);              // E.g., {}
});

// Add a route with a parameter
router.RouteAdd('/users/:id[09]', (registeredPath, actualPath, params) => {
console.log('Viewing user with ID:', params.id);
console.log('Registered Path:', registeredPath); // E.g., /users/:id
console.log('Actual Path:', actualPath);       // E.g., /users/123
console.log('Parameters:', params);              // E.g., { id: "123" }
});

// Add a special route for 404
router.RouteSpecialAdd(404, (registeredPath, actualPath, params) => {
console.warn('Page not found:', actualPath);
});

// Trigger navigation (changes the URL hash)
router.Trigger('/home'); // Navigates to #/home

// You can also trigger routes with parameters
router.Trigger('/users/456'); // Navigates to #/users/456
```

## API Reference

### `router.RouteSpecialAdd(code: number, routeFunction: RouteFunction): boolean`

Adds a callback function to handle special routes like 403 (Forbidden) or 404 (Not Found).

* `code`: The status code to handle (currently supports `403` and `404`).

* `routeFunction`: The function to execute when the error occurs. It must conform to the `RouteFunction` type (`(path: string, hashPath: string, params?: { [ key: string ]: string }) => ( void | Promise<void> )`).

* Returns `true` if the function was added successfully, `false` otherwise.

* Throws a `RangeError` if the code is not 403 or 404.

### `router.RouteAdd(path: string, routeFunction: RouteFunction, available?: CheckAvailability, routeFunction403?: RouteFunction): boolean`

Adds a new route to the router.

* `path`: The path string to match against (see [Path Syntax](#path-syntax)).

* `routeFunction`: The function to execute when the path matches *ed* is available. It must conform to the `RouteFunction` type.

* `available` (optional): A function to check if the route is available. It must conform to the `CheckAvailability` type (`(path: string, hashPath: string, params?: { [ key: string ]: string }) => ( boolean | Promise<boolean> )`). If this function returns `false` (or a Promise resolving to `false`), the main `routeFunction` will *not* be executed.

* `routeFunction403` (optional): A function specific to this route to execute if the `available` check fails (returns `false`). This takes precedence over the global 403 function defined with `RouteSpecialAdd`. It must conform to the `RouteFunction` type.

* Returns `true` if the route was added successfully, `false` if a route with the same "reduced path" (path with typed parameters normalized) already exists.

* Throws a `SyntaxError` if the path contains duplicate parameter IDs (e.g., `/users/:id/orders/:id`).

Routes are sorted based on a calculated "weight": routes with more static segments have a higher weight and are checked first.

### `router.RouteDel(path: string): boolean`

Removes a previously added route.

* `path`: The original path string used when adding the route (even if it contains parameters).

* Returns `true` if the route was found and removed, `false` otherwise.

* Throws a `SyntaxError` if the path contains duplicate parameter IDs (for consistency with `RouteAdd`).

### `router.Trigger(path: string): void`

Changes the URL hash in the browser window, initiating the routing process. Equivalent to setting `window.location.hash = '#' + path;`.

* `path`: The path string to navigate to (without the '#').

### `router.Route(path: string): Promise<boolean>`

This is the internal method that performs the route matching logic and callback function execution. It is called automatically by the `hashchange` event listener (`CheckHash`) or by `Trigger`. You should not need to call this directly in most cases unless you want to force routing for a specific path without changing the URL hash.

* `path`: The path string to match against (without the '#').

This function return false if the system was already in a routing step, so the path is just enqueued.

### `router.CheckHash(): Promise<void>`

This function is bound to the window's `hashchange` event. It executes automatically whenever the URL hash changes. It gets the current hash and calls `router.Route()` with the extracted hash. It manages an internal queue (`_queue`) if hash changes occur while a previous route is still being processed (e.g., by an async function).

## Path Syntax

Route paths can contain static segments and dynamic parameters.

* **Static Segments:** Any part of the path that does not start with `:`. E.g., `/products/details`.

* **Dynamic Parameters:** Start with `:` followed by a name (e.g., `:id`). They can include type hints in square brackets.

  * `/:name` and `/:name[AZ09]`: Matches one or more digit or upper or lower case letters (`a-zA-Z0-9+`). E.g., `/users/:username`.

  * `/:name[09]`: Matches one or more digits (`\d+`). E.g., `/products/:id[09]`.

  * `/:name[AZ]`: Matches one or more upper or lower case letters (`a-zA-Z+`). E.g., `/language/:code[AZ]`.

Example path: `/blog/:year[09]/:month[09]/:slug`. This would match `/blog/2023/10/my-article`.

**Restriction:** You cannot use the same parameter ID multiple times within the same path (e.g., `/users/:id/orders/:id` throws a `SyntaxError`).

## Parameters of RouteFunction and CheckAvailability

The `routeFunction`, `available`, and `routeFunction403` functions receive three arguments:

1. `path: string`: The *registered* path string in its "reduced" form (e.g., `/users/:id` instead of `/users/:id[09]`). Useful for identifying which route matched.

2. `hashPath: string`: The actual path string from the URL hash (without the '#'). This is the path that was matched against.

3. `params?: { [ key: string ]: string }`: An object containing the values extracted from the dynamic path parameters. Keys are the parameter names defined in the path (e.g., `id`), values are the corresponding strings from the `hashPath`.

Example with `/users/:id[09]` and URL `#/users/123`:

* `path`: `/users/:id`

* `hashPath`: `/users/123`

* `params`: `{ id: "123" }`

## Special Routes (403 and 404)

You can define handlers for common errors:

* **404 Not Found:** The function registered with `RouteSpecialAdd(404, ...)` is called if no route matches the URL hash.

* **403 Forbidden:** A 403 function is called if a route *matches*, but its `available` function returns `false`. The precedence for the 403 function is:

  1. The `routeFunction403` defined specifically for the route that matched.

  2. The global 403 function defined with `RouteSpecialAdd(403, ...)`.

  3. If neither a specific nor a global 403 function is defined, the route fails silently regarding the 403 handler. If there is no valid `routeFunction` either (due to the `available` check failure), the router might fall through to the 404 handler if defined.

## Async Functions

`routeFunction`, `available`, and `routeFunction403` can be asynchronous functions (`async`). The router will await the Promises returned by these functions before proceeding, correctly handling asynchronous execution and the routing queue.

## Routing Queue

The router manages an internal queue (`_queue`) for URL hashes. If a hash change (via Trigger or user navigation) occurs while a previous route is still being processed (especially if using asynchronous functions), the new hash is added to the queue. Once the current route has finished processing, the router will check the queue and process the next hash, ensuring no hash changes are lost.
