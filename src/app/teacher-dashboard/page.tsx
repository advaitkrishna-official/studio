"use client";

import { useAuth } from "@/components/auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const TeacherDashboardPage = () => {
  const { user, loading, userType } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (userType !== 'teacher') {
        router.push('/'); // Redirect non-teachers
      }
    }
  }, [user, loading, userType, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading Teacher Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Teacher Dashboard</h1>
      <p>Welcome, Teacher {user?.email}!</p>
      {/* Add Teacher Features Here */}
    </div>
  );
};

export default TeacherDashboardPage;
