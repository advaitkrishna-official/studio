# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Troubleshooting Common Issues

### Chunk Loading Errors (404 for JS files)

If you encounter errors like "Failed to load resource" for JavaScript files (e.g., `/static/chunks/...js`) with a 404 status, it's often due to a mismatch between the client's expected files and the server's available files, especially after a deployment or build.

To fix this:

1.  **Delete the `.next` directory**: This directory contains Next.js's build cache.
    ```bash
    rm -rf .next
    ```
2.  **Rebuild the project**:
    ```bash
    npm run build
    ```
3.  **Restart your server**: If running locally, stop and restart your development server (`npm run dev`) or production server (`npm run start`). If deployed, this might involve re-deploying.

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
