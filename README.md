# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Troubleshooting Common Issues

### **IMPORTANT: Chunk Loading Errors / Failed to load resource (404 for JS/CSS files)**

If you encounter errors like:
- `ChunkLoadError: Loading chunk ... failed.`
- `Failed to load resource: the server responded with a status of 404 ()` for files in `/_next/static/chunks/...` or `/static/chunks/...`

This is a common Next.js issue, often due to a mismatch between the client's expected files and the server's available files. This can happen after a new deployment, if a build process was interrupted, or if there's a caching issue.

**PRIMARY SOLUTION: Follow these steps in order:**

1.  **Force a Hard Refresh & Clear Cache (Browser):**
    *   Open your browser's developer tools (usually F12 or Cmd+Opt+I / Ctrl+Shift+I).
    *   Go to the "Network" tab.
    *   Check the "Disable cache" option.
    *   Right-click the browser's refresh button and select "Empty Cache and Hard Reload" (or a similar option like "Hard Reload").

2.  **If the issue persists (especially in a local development environment or self-hosted production):**
    *   **a. Stop your Next.js server.**
    *   **b. Delete the `.next` directory**: This directory in your project's root contains Next.js's build cache and previous build outputs. Deleting it forces a clean build.
        ```bash
        rm -rf .next
        ```
        (On Windows, you can delete the folder manually through File Explorer).
    *   **c. Rebuild the project**:
        ```bash
        npm run build
        ```
    *   **d. Restart your server**:
        *   For development: `npm run dev`
        *   For production: `npm run start`
    *   **e. After restarting, try the Hard Refresh (Step 1) again.**

3.  **If deployed to a platform (like Vercel, Firebase App Hosting, Netlify, etc.):**
    *   **Trigger a new deployment.** This usually involves pushing a new commit or manually re-deploying through the platform's dashboard. This ensures the server has the latest, consistent build artifacts.

**Other potential causes and solutions:**

*   **Check Base Path:** If you're using a `basePath` in your `next.config.ts`, ensure it's correctly configured and that your server and links are serving assets from that path.
*   **CDN or Caching Layers:** If you have a CDN (Content Delivery Network) or other caching layers (like Varnish, Nginx caching) in front of your application, try purging their cache.
*   **Service Worker Issues:** If your application uses a service worker, it might be caching old assets. Try unregistering the service worker in your browser's developer tools (Application -> Service Workers -> Unregister) and then hard refresh.
*   **Build Process Interruption:** Ensure your build process (`npm run build`) completes without errors. An interrupted build can lead to missing chunks.

These steps usually resolve chunk loading errors by ensuring the client and server are synchronized with the latest build files.

### Hydration Errors

Hydration errors (e.g., "Hydration failed because the server rendered HTML didn't match the client") can occur for various reasons. One common cause, especially if you see unexpected attributes like `data-new-gr-c-s-check-loaded` or `data-gr-ext-installed` in the error messages, is browser extensions modifying the HTML.

To mitigate this:
1.  **Disable Browser Extensions**: Try running your application in an incognito/private window or with browser extensions temporarily disabled to see if the error persists.
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

