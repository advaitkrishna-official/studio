'use client';

import Link from 'next/link';
import { useEffect, useState } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/components/auth-provider";

const ClientComponent = () => {
  const router = useRouter();
  const { user, loading, userType, userClass } = useAuth();
  const [redirecting, setRedirecting] = useState(true); // Add state to track redirection

  useEffect(() => {
    // Only proceed if loading is complete
    if (!loading) {
      let targetPath = "/login"; // Default redirect path

      if (user) {
        // User is logged in, determine dashboard based on role
        if (userType === 'teacher') {
          targetPath = '/teacher-dashboard';
          // Optionally add class query param if needed, but ensure userClass is stable
          // if (userClass) targetPath += `?class=${userClass}`;
        } else if (userType === 'student') {
          targetPath = '/student-dashboard';
        } else {
          // Unknown role or still loading role, maybe default to login or a loading page
          // Keep targetPath as '/login' or handle appropriately
          console.warn("User logged in but role is unknown or loading, redirecting to login.");
        }
      }
      // Perform redirection only once
      // Check if the current path is already the target path to avoid unnecessary replace calls
      if (redirecting && router.pathname !== targetPath) {
        console.log(`Redirecting to: ${targetPath}`);
        router.replace(targetPath);
        // No need to setRedirecting(false) here, as the component will unmount or re-render with new props
      } else if (router.pathname === targetPath) {
        // If already at the target path, stop the redirection attempt
         setRedirecting(false);
      }
    }
  }, [user, loading, userType, userClass, router, redirecting]); // Add redirecting to dependencies


  // Show loader only while loading or initial redirection is pending
  if (loading || (redirecting && (!user || (userType !== 'teacher' && userType !== 'student')))) {
     // Keep showing loader if loading, or if redirecting and user/role is not yet determined for dashboard access
    return (
      <div className="flex items-center justify-center min-h-screen">
         <span className="loader"></span>
      </div>
    );
  }


  // Render null or minimal content after redirection attempt
  // This prevents flashing content if the user somehow lands back here
  return null;
}


export default function Home() {
  return <ClientComponent />;
}
