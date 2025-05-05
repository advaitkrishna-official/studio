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

    let target = '/login';

    if (user) {
      if (userType === 'teacher') {
        target = '/teacher-dashboard';
        // if (userClass) target += `?class=${userClass}`;
      } else if (userType === 'student') {
        target = '/student-dashboard';
      } else {
        console.warn('Unknown role, sending to login');
      }
    }

    if (pathname !== target) {
      console.log(`Redirecting to: ${target}`);
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

  return null;
}

export default function Home() {
  return <Redirector />;
}
