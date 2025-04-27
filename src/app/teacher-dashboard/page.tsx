'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";

interface ClassEvent {
  id: string;
  title: string;
  date: Date;
  description: string;
  type: 'event' | 'task';
}

const TeacherDashboardPage = () => {
  const { user, userType, userClass, signOut } = useAuth();
  const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ClassEvent[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [errorTasks, setErrorTasks] = useState<string | null>(null);

  useEffect(() => {
    if (userType !== 'teacher') {
      router.push('/login');
    }
  }, [user, userType, router]);

    useEffect(() => {
        const fetchTasks = async () => {
            setLoadingTasks(true);
            setErrorTasks(null);
            try {
                if (!user || !userClass) {
                    setErrorTasks("User not logged in or class not defined.");
                    return;
                }

                const tasksCollection = collection(db, 'classes', userClass, 'events');
                const q = query(tasksCollection, where("type", "==", "task"));

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const tasksData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        date: (doc.data() as any).date.toDate(), 
                    })) as any[];
                    setTasks(tasksData);
                });

                return () => unsubscribe();
            } catch (e: any) {
                setErrorTasks(e.message || "An error occurred while fetching tasks.");
            } finally {
                setLoadingTasks(false);
            }
        };

        fetchTasks();
    }, [user, userClass]);

  const dashboardLinks = [
    {
      title: 'Lesson Planner',
      href: '/teacher-dashboard/lesson-planner',
      description: 'Create and manage lesson plans.',
      icon: Icons.bookOpen,
    },
    {
      title: 'Quiz Builder',
      href: '/teacher-dashboard/quiz-builder',
      description: 'Create and manage quizzes.',
      icon: Icons.graduationCap,
    },
    {
      title: 'Student Manager',
      href: '/teacher-dashboard/student-manager',
      description: 'Manage student profiles and track their progress.',
      icon: Icons.user,
    },
    {
      title: 'Teachers Assignment Hub',
      href: '/teacher-dashboard/teachers-assignment-hub',
      description: 'Create and manage assignments.',
      icon: Icons.file,
    },
    {
      title: 'Class Calendar',
      href: '/teacher-dashboard/class-calendar',
      description: 'View and manage class schedules.',
      icon: CalendarIcon,
    },
    {
      title: 'Overview',
      href: '/teacher-dashboard/overview',
      description: 'View an overview of class performance.',
      icon: Icons.lightbulb,
    },
  ];

  const totalStudents = 25;
  const pendingAssignments = 5;
  const overdueSubmissions = 2;
  const avgClassProgress = 75;
  const upcomingEvents = 3;

  if (!user || userType !== 'teacher') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Teacher Home</h1>

      {/* KPI Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="shadow-md">
          <CardContent className="flex items-center p-4">
            <Icons.file className="h-6 w-6 mr-2 text-indigo-600" />
            <div>
              <CardTitle className="text-lg font-semibold">Pending Assignments</CardTitle>
              <CardDescription className="text-gray-600">{pendingAssignments}</CardDescription>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="flex items-center p-4">
            <Icons.close className="h-6 w-6 mr-2 text-red-600" />
            <div>
              <CardTitle className="text-lg font-semibold">Overdue Submissions</CardTitle>
              <CardDescription className="text-gray-600">{overdueSubmissions}</CardDescription>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="flex items-center p-4">
            <Icons.check className="h-6 w-6 mr-2 text-green-600" />
            <div>
              <CardTitle className="text-lg font-semibold">Average Class Progress</CardTitle>
              <div className="flex items-center">
                <CardDescription className="text-gray-600">{avgClassProgress}%</CardDescription>
                <Progress value={avgClassProgress} className="ml-2 w-24" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardContent className="flex items-center p-4">
            <CalendarIcon className="h-6 w-6 mr-2 text-blue-600" />
            <div>
              <CardTitle className="text-lg font-semibold">Upcoming Events</CardTitle>
              <CardDescription className="text-gray-600">{upcomingEvents}</CardDescription>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Toolbar */}
      <div className="flex justify-between mb-8">
        <Button variant="primary"><Icons.plus className="mr-2" /> New Assignment</Button>
        <Button variant="primary"><Icons.plus className="mr-2" /> New Quiz</Button>
        <Button variant="primary"><Icons.plus className="mr-2" /> New Lesson Plan</Button>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dashboardLinks.map((link) => (
          <Card key={link.href} className="p-6 shadow-md rounded-md hover:scale-[1.02] transition-transform border border-transparent hover:border-accent">
            <CardContent className="flex flex-col gap-4">
              <link.icon className="h-8 w-8 text-indigo-600" />
              <CardTitle className="text-lg font-semibold">{link.title}</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">{link.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Feed */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTasks ? (
            <p>Loading tasks...</p>
          ) : errorTasks ? (
            <p className="text-red-500">{errorTasks}</p>
          ) : tasks.length > 0 ? (
            <ul className="list-disc pl-5">
              {tasks.map((task) => (
                <li key={task.id} className="py-2 border-b">
                  {task.title} - Due: {task.date}
                </li>
              ))}
            </ul>
          ) : (
            <p>No tasks assigned yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherDashboardPage;
