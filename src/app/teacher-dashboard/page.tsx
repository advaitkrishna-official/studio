"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  DocumentData,
} from "firebase/firestore";
import { format } from "date-fns";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar as CalendarIcon } from "lucide-react";

interface ClassEvent {
  id: string;
  title: string;
  date: Date;
  description?: string;
  type: "task" | "event";
}

const TeacherDashboardPage: React.FC = () => {
  const { user, userType, userClass } = useAuth();
  const router = useRouter();

  // State for recent tasks
  const [tasks, setTasks] = useState<ClassEvent[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [errorTasks, setErrorTasks] = useState<string | null>(null);

  // KPI placeholders — replace with real queries as needed
  const pendingAssignments = 5;
  const overdueSubmissions = 2;
  const avgClassProgress = 75;
  const upcomingEvents = 3;

  // Redirect non-teachers to login
  useEffect(() => {
    if (userType !== "teacher") {
      router.push("/login");
    }
  }, [userType, router]);

  // Listen for 'task' items in class events
  useEffect(() => {
    if (!user || !userClass) return;

    setLoadingTasks(true);
    setErrorTasks(null);

    const col = collection(db, "classes", userClass, "events");
    const q = query(col, where("type", "==", "task"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const data = snap.docs.map((d) => {
          const raw = d.data() as DocumentData;
          return {
            id: d.id,
            title: raw.title,
            description: raw.description,
            type: raw.type,
            date: raw.date.toDate(),
          } as ClassEvent;
        });
        setTasks(data);
        setLoadingTasks(false);
      },
      (err) => {
        setErrorTasks(err.message);
        setLoadingTasks(false);
      }
    );

    return () => unsubscribe();
  }, [user, userClass]);

  if (!user || userType !== "teacher") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );
  }

  const dashboardLinks = [
    {
      title: "Lesson Planner",
      href: "/teacher-dashboard/lesson-planner",
      description: "Create and manage lesson plans.",
      icon: Icons.bookOpen,
    },
    {
      title: "Quiz Builder",
      href: "/teacher-dashboard/quiz-builder",
      description: "Create and manage quizzes.",
      icon: Icons.graduationCap,
    },
    {
      title: "Student Manager",
      href: "/teacher-dashboard/student-manager",
      description: "Manage student profiles and track their progress.",
      icon: Icons.user,
    },
    {
      title: "Teachers Assignment Hub",
      href: "/teacher-dashboard/teachers-assignment-hub",
      description: "Create and manage assignments.",
      icon: Icons.file,
    },
    {
      title: "Class Calendar",
      href: "/teacher-dashboard/class-calendar",
      description: "View and manage class schedules.",
      icon: CalendarIcon,
    },
    {
      title: "Overview",
      href: "/teacher-dashboard/overview",
      description: "View an overview of class performance.",
      icon: Icons.lightbulb,
    },
  ];

  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">Teacher Home</h1>

      {/* KPI Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-md">
          <CardContent className="flex items-center gap-3 p-4">
            <Icons.file className="h-6 w-6 text-indigo-600" />
            <div>
              <CardTitle className="text-lg">Pending Assignments</CardTitle>
              <CardDescription>{pendingAssignments}</CardDescription>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardContent className="flex items-center gap-3 p-4">
            <Icons.close className="h-6 w-6 text-red-600" />
            <div>
              <CardTitle className="text-lg">Overdue Submissions</CardTitle>
              <CardDescription>{overdueSubmissions}</CardDescription>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardContent className="flex items-center gap-3 p-4">
            <Icons.check className="h-6 w-6 text-green-600" />
            <div>
              <CardTitle className="text-lg">Avg. Class Progress</CardTitle>
              <div className="flex items-center gap-2">
                <span>{avgClassProgress}%</span>
                <Progress value={avgClassProgress} className="w-24" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardContent className="flex items-center gap-3 p-4">
            <CalendarIcon className="h-6 w-6 text-blue-600" />
            <div>
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
              <CardDescription>{upcomingEvents}</CardDescription>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Toolbar */}
      <div className="flex gap-4">
        <Button variant="secondary">
          <Icons.plus className="mr-2" />
          New Assignment
        </Button>
        <Button variant="secondary">
          <Icons.plus className="mr-2" />
          New Quiz
        </Button>
        <Button variant="secondary">
          <Icons.plus className="mr-2" />
          New Lesson Plan
        </Button>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {dashboardLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="p-6 shadow-md rounded-md hover:scale-[1.02] transition-transform border border-transparent hover:border-blue-300 cursor-pointer">
              <CardContent className="flex flex-col gap-4">
                <link.icon className="h-8 w-8 text-indigo-600" />
                <CardTitle className="text-lg font-semibold">
                  {link.title}
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  {link.description}
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Tasks Feed */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Recent Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTasks ? (
            <p>Loading tasks…</p>
          ) : errorTasks ? (
            <p className="text-red-500">{errorTasks}</p>
          ) : tasks.length > 0 ? (
            <ul className="divide-y">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className="py-2 flex justify-between items-center"
                >
                  <span>{t.title}</span>
                  <Badge>{format(t.date, "dd/MM/yyyy")}</Badge>
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
