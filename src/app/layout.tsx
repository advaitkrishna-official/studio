'use client';

import { Geist, Geist_Mono } from 'next/font/google';
import '@/app/globals.css';
import { ReactNode } from 'react';
import AuthProvider from '@/components/auth-provider'; // Corrected import path
import { Toaster } from "@/components/ui/toaster"; // Import Toaster
import { metadata } from './metadata'; // Import metadata

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
      {/* Removed potentially problematic attributes often added by extensions */}
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          {children}
          <Toaster /> {/* Add Toaster here for app-wide toasts */}
        </AuthProvider>
      </body>
    </html>
  );
}
