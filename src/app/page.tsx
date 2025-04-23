'use client';

import Link from 'next/link';
import { useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/components/auth-provider";
import { seedInitialData } from "@/lib/firebase";


export default function Home() {
  const router = useRouter();
  const { user, loading, userType } = useAuth();


  useEffect(() => {
    // Seed the database with initial data
    seedInitialData();

    if (!loading) {
      if (!user) {
        router.push("/login");
        return;
      }
    
      if (userType === 'teacher') {
        router.push(`/teacher-dashboard?class=${user?.class}`);
      } else {
        router.push(`/student-dashboard`);
      }
    }
  }, [user, loading, userType, router]);

  if (loading)  {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Redirecting...</p>
        </div>
    );
}
