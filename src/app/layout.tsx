// src/app/layout.tsx
'use client';

import { Geist, Geist_Mono } from 'next/font/google';
import '@/app/globals.css';
import AuthProvider from '@/components/auth-provider';
import { Toaster } from "@/components/ui/toaster";
import { ReactNode, Suspense } from 'react';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Loading component to show while Suspense is waiting
const LoadingComponent = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <span className="loader"></span>
    </div>
  );
};


export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      {/*
        The hydration error mentioning 'data-new-gr-c-s-check-loaded' and 'data-gr-ext-installed'
        strongly suggests that a browser extension (like Grammarly) is modifying the HTML
        after the server renders it but before React hydrates on the client. This mismatch
        causes the hydration error.

        Adding `suppressHydrationWarning={true}` to the `<html>` or `<body>` tag can help mitigate this
        if the differences are known and accepted (e.g., attributes added by extensions).
        Ensure browser extensions are disabled for testing if the error persists.
      */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning={true}>
        {/* AuthProvider is a Client Component, wrapping children here */}
        <AuthProvider>
           <Suspense fallback={<LoadingComponent />}>
            {children}
          </Suspense>
          <Toaster /> {/* Ensure Toaster is included */}
        </AuthProvider>
      </body>
    </html>
  );
}