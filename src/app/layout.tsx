'use client';

import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useAuth} from '@/components/auth-provider';
import {Metadata} from 'next';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

import {getAuth, onAuthStateChanged} from 'firebase/auth';
import {auth} from '@/lib/firebase';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

import {metadata} from './metadata';

function AuthProvider({children}: {children: React.ReactNode}) {
  const router = useRouter();
  const {user, loading, setUser, setUserType, setUserClass} = useAuth();

  useEffect(() => {
    const unsubscribe = auth
      ? onAuthStateChanged(auth, async user => {
          if (user) {
            setUser(user);
            let type: 'student' | 'teacher' = 'student';
            let classVal: string | null = null;

            try {
              if (user.email?.endsWith('@teacher.com')) {
                type = 'teacher';
              }
              setUserType(type);
              setUserClass(classVal);
            } catch (error) {
              console.error('Error fetching user role from Firestore:', error);
              setUserType(user.email?.endsWith('@teacher.com') ? 'teacher' : 'student');
            }
          } else {
            setUser(null);
            setUserType(null);
            setUserClass(null);
            router.push('/login');
          }
        })
      : () => {};

    return () => unsubscribe();
  }, [router, setUser, setUserType, setUserClass]);

  return <>{children}</>;
}
