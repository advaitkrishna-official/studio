// src/app/layout.tsx
'use client'; // This directive is necessary because AuthProvider is used here

import { Geist, Geist_Mono } from 'next/font/google';
import '@/app/globals.css';
import { ReactNode } from 'react'; // Removed useEffect import as it's not used directly here
import AuthProvider from '@/components/auth-provider';
import { Toaster } from "@/components/ui/toaster"; // Ensure Toaster is imported

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Metadata should be defined in metadata.ts or a server component, not here.

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      {/*
        The hydration error mentioning 'data-new-gr-c-s-check-loaded' and 'data-gr-ext-installed'
        strongly suggests that a browser extension (like Grammarly) is modifying the HTML
        after the server renders it but before React hydrates on the client. This mismatch
        causes the hydration error.

        The code below follows best practices for avoiding hydration issues originating
        from the application code itself. The root cause is likely external.
        Ensure browser extensions are disabled for testing if the error persists.
      */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* AuthProvider is a Client Component, wrapping children here */}
        <AuthProvider>
          {children}
          <Toaster /> {/* Ensure Toaster is included */}
        </AuthProvider>
      </body>
    </html>
  );
}
