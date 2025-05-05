// src/app/layout.tsx
import { Geist, Geist_Mono } from 'next/font/google';
import '@/app/globals.css';
import type { ReactNode } from 'react';
import AuthProvider from '@/components/auth-provider'; // Import AuthProvider directly
import { Toaster } from "@/components/ui/toaster";
import { metadata } from './metadata';

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
