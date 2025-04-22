'use client';

import { useAuth } from "@/components/auth-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { getAuth } from "firebase/auth";
import {app} from "@/lib/firebase";

const TeacherDashboardPage = () => {
  const { user, loading, userType } = useAuth();
  const router = useRouter();
    const searchParams = useSearchParams();
    const classId = searchParams.get('class');

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
        return;
      }

      if (userType !== 'teacher') {
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
      <p>Welcome, Teacher {user?.email} </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Overview Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>View student performance overview.</CardDescription>
          </CardHeader>
          <CardContent>
           <Link href={`/teacher-dashboard/overview?class=${classId}`}>
              <Button variant="secondary">
                View Details <Icons.arrowRight className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Student Manager */}
        <Card>
          <CardHeader>
            <CardTitle>Student Manager</CardTitle>
            <CardDescription>Manage student profiles and track progress.</CardDescription>
          </CardHeader>
          <CardContent>
           <Link href={`/teacher-dashboard/student-manager?class=${classId}`}>
              <Button variant="secondary">
                View Details <Icons.arrowRight className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

         {/* AI-Powered Lesson Planner */}
         <Card>
          <CardHeader>
            <CardTitle>AI-Powered Lesson Planner</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href={`/teacher-dashboard/lesson-planner?class=${classId}`}>
              <Button variant="secondary">
                View Details <Icons.arrowRight className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Quiz Builder */}
        <Card>
          <CardHeader>
            <CardTitle>Quiz Builder</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Add quiz building features here */}
            <p>Create &amp; Assign MCQs using AI</p>
            <p>Auto-Grading + Analytics</p>
          </CardContent>
        </Card>

        {/* Content Repository */}
        <Card>
          <CardHeader>
            <CardTitle>Content Repository</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Add content repository features here */}
            <p>Upload/Share PDFs, Videos, Slides</p>
            <p>Tag by Subject/Grade</p>
          </CardContent>
        </Card>

        {/* Class Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Class Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Add class calendar features here */}
            <p>Schedule Classes &amp; Assignments</p>
            <p>Sync with Student Dashboards</p>
            <p>Push Notifications</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;
