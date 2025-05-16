
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';

function Redirector() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, userType, userClass } = useAuth();

  useEffect(() => {
    if (loading) return;

    let target: string | null = null;

    if (user) {
      if (userType === 'teacher') {
        target = '/teacher-dashboard';
      } else if (userType === 'student') {
        target = '/student-dashboard';
      } else {
        // Unknown role, or role not yet determined
        // console.warn('Redirector: Unknown user role or role not loaded, staying on current page or redirecting to landing.');
        // If already on landing, login, or register, do nothing. Otherwise, go to landing.
        if (pathname !== '/landing' && pathname !== '/login' && pathname !== '/register') {
          target = '/landing';
        }
      }
    } else {
      // No user, redirect to landing page if not already on landing, login, or register
      if (pathname !== '/landing' && pathname !== '/login' && pathname !== '/register') {
        target = '/landing';
      }
    }

    if (target && pathname !== target) {
      console.log(`Redirecting from ${pathname} to: ${target}`);
      router.replace(target);
    }
  }, [user, loading, userType, userClass, router, pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loader"></span>
      </div>
    );
  }

  return null; // This component only handles redirection
}

export default function Home() {
  return <Redirector />;
}
