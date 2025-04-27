'use client';

import {useAuth} from '@/components/auth-provider';
import {useRouter, useSearchParams} from 'next/navigation';
import {useEffect} from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import Link from 'next/link';
import {Button} from '@/components/ui/button';
import {Icons} from '@/components/icons';
import {getAuth} from 'firebase/auth';
import {app} from '@/lib/firebase';
import {cn} from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const TeacherDashboardPage = () => {
  const {user, loading, userType} = useAuth();
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
         <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open user menu</span>
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://github.com/shadcn.png" alt="Shadcn" />
                <AvatarFallback>SC</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Link href="/login" className="w-full h-full block">
                Log Out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="text-muted-foreground">Welcome, Teacher {user?.email}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {/* Overview Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>View student performance overview.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/teacher-dashboard/overview?class=${classId}`}>
              <Button variant="secondary" className="w-full">
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
              <Button variant="secondary" className="w-full">
                View Details <Icons.arrowRight className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* AI-Powered Lesson Planner */}
        <Card>
          <CardHeader>
            <CardTitle>AI-Powered Lesson Planner</CardTitle>
            <CardDescription>Generate and manage lesson plans with AI.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/teacher-dashboard/lesson-planner?class=${classId}`}>
              <Button variant="secondary" className="w-full">
                View Details <Icons.arrowRight className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Quiz Builder */}
        <Card>
          <CardHeader>
            <CardTitle>Quiz Builder</CardTitle>
            <CardDescription>Create and assign quizzes to students.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/teacher-dashboard/quiz-builder?class=${classId}`}>
              <Button variant="secondary" className="w-full">
                View Details <Icons.arrowRight className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Content Repository */}
        <Card>
          <CardHeader>
            <CardTitle>Teachers Assignment Hub</CardTitle>
            <CardDescription>Upload and share learning resources.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/teacher-dashboard/content-repository?class=${classId}`}>
              <Button variant="secondary" className="w-full">
                View Details <Icons.arrowRight className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Class Calendar */}
        <Card>
          <CardHeader>
            <CardTitle>Class Calendar</CardTitle>
            <CardDescription>Schedule classes and assignments.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/teacher-dashboard/class-calendar?class=${classId}`}>
              <Button variant="secondary" className="w-full">
                View Details <Icons.arrowRight className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboardPage;
