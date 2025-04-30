'use client';

import Link from 'next/link';
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/components/auth-provider";
// Removed import: import { seedInitialData } from "@/lib/firebase";

const ClientComponent = () => {
  const router = useRouter();
  const { user, loading, userType, userClass } = useAuth();


  useEffect(() => {
    // Seed the database with initial data
    // If seeding is needed, ensure the function exists and is imported correctly,
    // or call a specific seeding endpoint/script.
    // Example: initializeDataIfNeeded();

    if (!loading) {
      if (!user) {
        router.push("/login");
        return;
      }

      if (userType === 'teacher') {
        // Ensure userClass is available before redirecting
        if (userClass) {
          router.push(`/teacher-dashboard?class=${userClass}`);
        } else {
          // Handle case where teacher class is not yet loaded or available
          console.log("Teacher class not found, redirecting to teacher dashboard base.");
          router.push(`/teacher-dashboard`);
        }
      } else if (userType === 'student') {
        router.push(`/student-dashboard`);
      } else {
        // Fallback if userType is null or unexpected
        console.log("User type unknown, redirecting to login.");
        router.push("/login");
      }
    };
  }, [user, loading, userType, userClass, router]); // Add userClass to dependency array

  if (loading)  {
    return (
      <div className="flex items-center justify-center min-h-screen">
         {/* You can replace this with a more sophisticated loader */}
         <span className="loader"></span>
      </div>
    );
  }

    // Render null or a minimal placeholder while redirecting
    // This prevents flashing content before redirection completes
    return null;
}


// Add loader CSS to a global scope or within a style tag if needed locally
// Ensure globals.css or another appropriate CSS file includes the loader styles

export default function Home() {
  return <ClientComponent />;
}
