# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Troubleshooting Common Issues

### Chunk Loading Errors (404 for JS files)

If you encounter errors like "Failed to load resource" or `ChunkLoadError` for JavaScript files (e.g., `/_next/static/chunks/...js` or `/static/chunks/...js`) with a 404 status, it's often due to a mismatch between the client's expected files and the server's available files. This can happen after a new deployment, if a build process was interrupted, or if there's a caching issue.

**To fix this, especially after a deployment:**

1.  **Force a Hard Refresh & Clear Cache (Browser):**
    *   Open your browser's developer tools (usually F12).
    *   Go to the "Network" tab.
    *   Check the "Disable cache" option.
    *   Right-click the refresh button and select "Empty Cache and Hard Reload".

2.  **If the issue persists (especially in a development environment or self-hosted production):**
    *   **Stop your Next.js server.**
    *   **Delete the `.next` directory**: This directory contains Next.js's build cache. In your project's root directory, run:
        ```bash
        rm -rf .next
        ```
    *   **Rebuild the project**:
        ```bash
        npm run build
        ```
    *   **Restart your server**:
        *   For development: `npm run dev`
        *   For production: `npm run start`
    *   **If deployed to a platform (like Vercel, Firebase App Hosting, etc.):**
        *   Trigger a new deployment. This usually involves pushing a new commit or manually re-deploying through the platform's dashboard. This ensures the server has the latest, consistent build artifacts.

3.  **Check Base Path:** If you're using a `basePath` in your `next.config.js`, ensure it's correctly configured and that your server is serving assets from that path.

4.  **CDN or Caching Layers:** If you have a CDN or other caching layers in front of your application, try purging their cache.

These steps usually resolve chunk loading errors by ensuring the client and server are synchronized with the latest build files.

### Hydration Errors

Hydration errors (e.g., "Hydration failed because the server rendered HTML didn't match the client") can occur for various reasons. One common cause, especially if you see unexpected attributes like `data-new-gr-c-s-check-loaded` or `data-gr-ext-installed` in the error messages, is browser extensions modifying the HTML.

To mitigate this:
1.  **Disable Browser Extensions**: Try running your application in an incognito window or with browser extensions temporarily disabled to see if the error persists.
2.  **`suppressHydrationWarning`**: If the differences are known and accepted (e.g., attributes added by extensions that you cannot control), you can add `suppressHydrationWarning={true}` to the `<html>` or `<body>` tag in your `src/app/layout.tsx`. This has already been implemented in this project.

```html
// Example from src/app/layout.tsx
<html lang="en" suppressHydrationWarning={true}>
  <body suppressHydrationWarning={true}>
    {/* ... */}
  </body>
</html>
```

## Content Repository Page
- Teachers can upload, organize, and manage learning resources.
- Resource types may include PDFs, videos, documents, and external links.
- Resources can be tagged by subject and grade level for easy searching.

```
