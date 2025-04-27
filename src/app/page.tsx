'use client';

import Link from 'next/link';
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/components/auth-provider";
import { seedInitialData } from "@/lib/firebase";

const ClientComponent = () => {
  const router = useRouter();
  const { user, loading, userType, userClass } = useAuth();


  useEffect(() => {
    // Seed the database with initial data
    seedInitialData();

    if (!loading) {
      if (!user) {
        router.push("/login");
        return;
      }
    
      if (userType === 'teacher') {
        router.push(`/teacher-dashboard?class=${userClass}`);
      } else {
        router.push(`/student-dashboard`);
      }
    };
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

export default function Home() {
  return <ClientComponent />;
}
