# Swagger UI Not Rendering on Vercel

## Problem

After deploying a NestJS application to Vercel, Swagger may not render correctly.

Common symptoms:

- `GET /docs-json` returns the OpenAPI JSON successfully.
- `GET /docs` opens a blank page.
- The Swagger page HTML is returned, but the UI has no styles or JavaScript behavior.
- The browser console or Network tab shows missing Swagger UI CSS or JS files.

## Root Causes

### 1. Swagger is configured only in the local entrypoint

In a normal NestJS application, Swagger is often configured in `src/main.ts`.

That works locally because local development runs:

```bash
npm run start
```

or:

```bash
npm run start:dev
```

However, when deploying this project to Vercel, production requests are handled by the serverless function entrypoint:

```text
api/index.ts
```

If Swagger is only configured in `src/main.ts`, Vercel will not use that Swagger setup for production requests.

### 2. Swagger UI static assets may not load correctly on Vercel

Swagger UI depends on CSS and JavaScript files from `swagger-ui-dist`.

In a serverless environment with rewrites, these internal static asset paths may fail or resolve incorrectly. When that happens:

- `/docs-json` still works.
- `/docs` returns HTML.
- But the Swagger UI page appears blank or broken because the CSS and JS assets are missing.

## Fix

### 1. Configure Swagger in the Vercel entrypoint

Make sure the Vercel serverless entrypoint calls the Swagger setup.

Example:

```ts
import { setupSwagger } from '../src/swagger';

// After creating the Nest app:
setupSwagger(nestApp);
```

In this project, that call is placed in:

```text
api/index.ts
```

This is required because Vercel handles production requests through `api/index.ts`, not through `src/main.ts`.

### 2. Use CDN assets for Swagger UI

Configure Swagger UI to load CSS and JavaScript from a CDN:

```ts
SwaggerModule.setup('docs', app, swaggerDocument, {
  jsonDocumentUrl: 'docs-json',
  customCssUrl: 'https://unpkg.com/swagger-ui-dist/swagger-ui.css',
  customJs: [
    'https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js',
    'https://unpkg.com/swagger-ui-dist/swagger-ui-standalone-preset.js',
  ],
  swaggerOptions: {
    url: '/docs-json',
  },
});
```

This avoids relying on Vercel serving Swagger UI's internal static files.

### 3. Keep the Swagger setup in a shared file

For readability, this project keeps the Swagger configuration in:

```text
src/swagger.ts
```

Both entrypoints can call the same setup function:

```ts
setupSwagger(app);
```

Use it in:

- `src/main.ts` for local development.
- `api/index.ts` for Vercel production.

## Minimal Vercel Routing

The `vercel.json` file routes all requests to the serverless entrypoint:

```json
{
  "version": 2,
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.ts"
    }
  ]
}
```

This means public URLs stay clean:

```text
/hello
/docs
/docs-json
```

The public API path is not `/api/index`.

## Verification

After deployment, verify these endpoints:

```bash
curl https://<your-vercel-domain>/hello
curl https://<your-vercel-domain>/docs-json
```

Then open:

```text
https://<your-vercel-domain>/docs
```

If `/docs-json` works but `/docs` is blank, open browser DevTools and check:

1. Network tab: the Swagger UI CDN files should return `200`.
2. Console tab: there should be no JavaScript runtime error or CSP error.
3. Source code: `api/index.ts` must call `setupSwagger(nestApp)`.

## Summary

The issue is usually not the OpenAPI document itself. The document can be generated correctly while the Swagger UI fails to render.

The fix is:

1. Run Swagger setup in the Vercel entrypoint `api/index.ts`.
2. Load Swagger UI CSS and JS from CDN.
3. Explicitly point Swagger UI to `/docs-json`.
