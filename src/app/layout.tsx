'use client'; // This directive might be causing issues if metadata is exported here. Move metadata export.

import { Geist, Geist_Mono } from 'next/font/google';
import '@/app/globals.css';
import AuthProvider from '@/components/auth-provider'; // Import AuthProvider directly
import { Toaster } from "@/components/ui/toaster";
import type { ReactNode } from 'react';
// Metadata should be exported from a server component or the metadata.ts file, not a 'use client' file.
// import { metadata } from './metadata'; // Remove metadata import/export from client component layout

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});


export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* AuthProvider is a Client Component, wrapping children here */}
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
