---
sidebar_position: 7
---

# Built-in Middlewares

Arkos comes with a set of built-in middlewares that handle common tasks like compression, security, and parsing. This document outlines each middleware, its purpose, and how to configure it.

:::note
The following code snippets are **Arkos** behind the scenes implementation of each built-in middleware.
:::

## Compression

The compression middleware reduces the size of HTTP responses sent to clients.

```typescript
app.use(compression(arkosConfig?.compressionOptions));
```

**Configuration Options:**

- Pass custom compression options via `arkosConfig.compressionOptions`
- Accepts all options from the [compression](https://github.com/expressjs/compression) package

**Customization:**

- Can be disabled or replaced with your own implementation
- See [Modifying Built-in Middlewares Guide](/docs/advanced-guide/modifying-built-in-middlewares)

## Global Rate Limiting

Protects your API from abuse by limiting the number of requests per client.

```ts
app.use(
    rateLimit({
        windowMs: 60 * 1000, // 1 minute
        limit: 1000, // 1000 requests per windowMs
        standardHeaders: "draft-7",
        legacyHeaders: false,
    })
);
```

**Configuration Options:**

- Override default settings via `arkosConfig.globalRequestRateLimitOptions`
- Default: 1000 requests per minute

**Customization:**

- Can be disabled or replaced with your own implementation
- See [Modifying Built-in Middlewares Guide](/docs/advanced-guide/modifying-built-in-middlewares)

## CORS

Configures Cross-Origin Resource Sharing policy for your API.

**Configuration Options:**

- Set allowed origins via `arkosConfig.cors.allowedOrigins` (array, string, or "\*")
- Provide custom options via `arkosConfig.cors.options`
- Replace entire handler with `arkosConfig.cors.customHandler`

**Customization:**

- Can be disabled or replaced with your own implementation
- See [Modifying Built-in Middlewares Guide](/docs/advanced-guide/modifying-built-in-middlewares)

## JSON Body Parser

Parses incoming JSON request bodies.

```typescript
app.use(express.json(arkosConfig?.jsonBodyParserOptions));
```

**Configuration Options:**

- Override with custom options via `arkosConfig.jsonBodyParserOptions`
- Accepts all options from Express's [json](https://expressjs.com/en/api.html#express.json) method

**Customization:**

- Can be disabled or replaced with your own implementation
- See [Modifying Built-in Middlewares Guide](/docs/advanced-guide/modifying-built-in-middlewares)

## Cookie Parser

Parses Cookie header and populates `req.cookies`.

```typescript
app.use(cookieParser(...[...(arkosConfig?.cookieParserParameters || [])]));
```

**Configuration Options:**

- Provide custom parameters via `arkosConfig.cookieParserParameters`

**Customization:**

- Can be disabled or replaced with your own implementation
- See [Modifying Built-in Middlewares Guide](/docs/advanced-guide/modifying-built-in-middlewares)

## Query Parser

Parses query string parameters into appropriate JavaScript types.

```typescript
app.use(
    queryParser({
        parseNull: true,
        parseUndefined: true,
        parseBoolean: true,
    })
);
```

**Configuration Options:**

- Override default settings via `arkosConfig.queryParserOptions`
- Default: parses null values, undefined values, and booleans

**Customization:**

- Can be disabled or replaced with your own implementation
- See [Modifying Built-in Middlewares Guide](/docs/advanced-guide/modifying-built-in-middlewares)

## Database Connection Check

Validates database connectivity before request processing.

```typescript
app.use(checkDatabaseConnection);
```

**Customization:**

- Can be disabled or replaced with your own implementation
- See [Modifying Built-in Middlewares Guide](/docs/advanced-guide/modifying-built-in-middlewares)

## Request Logger

Logs incoming requests for debugging and monitoring.

```typescript
app.use(handleRequestLogs);
```

**Customization:**

- Can be disabled or replaced with your own implementation
- See [Modifying Built-in Middlewares Guide](/docs/advanced-guide/modifying-built-in-middlewares)

## Global Error Handler

Captures and formats errors thrown during request processing.

```typescript
app.use(errorHandler);
```

**Customization:**

- Can be disabled or replaced with your own implementation
- See [Modifying Built-in Middlewares Guide](/docs/advanced-guide/modifying-built-in-middlewares)

## Adding Custom Middlewares

To add your own middlewares to the stack:

```ts
// src/app.ts
import arkos from "arkos";

arkos.init({
    middlewares: {
        additional: [myCustomMiddleware, anotherMiddleware],
    },
    // other configs
});
```

:::warning
This will not override the built-in middlewares because they will be placed right after the whole built-in middleware stack, if you would like to replace or disable any built-in middleware see [Modifying Built-in Middlewares Guide](/docs/advanced-guide/modifying-built-in-middlewares).
:::

### Where Custom Middlewares Are Placed

Bear in mind that these stack of middlewares will be passed right after all built-in middlewares mentioned above. If you want to put custom middlewares before all **Arkos** built-in configurations pass a function to `configureApp` under configs to have acess to express app before any **Arkos** configurations, see the [Acessing The Express App Guide](/docs/guide/accessing-the-express-app).

## Next Steps:

- [Replacing Or Disabling Built-in Middlewares](/docs/advanced-guide/modifying-built-in-middlewares)
- [Built-in Routers](/docs/api-reference/built-in-routers)
- [Acessing The Express App](/docs/guide/accessing-the-express-app)
