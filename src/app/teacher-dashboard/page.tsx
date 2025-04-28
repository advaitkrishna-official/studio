'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { auth, db } from '@/lib/firebase';
import { collection, query, onSnapshot, where, DocumentData, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { format } from 'date-fns';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import {
  Search,
  Menu,
  Home,
  ListChecks,
  BookOpenCheck,
  LayoutGrid,
  PencilRuler,
  BookOpen,
  LineChart,
  LogOut,
  Code,
  Database,
  Cpu,
  Hash,
} from 'lucide-react';

import MyAssignments from './my-assignments/page';

interface ClassEvent {
  id: string;
  title: string;
  description: string;
  type: string;
  dueDate: Date;
}

function Sidebar() {
  const router = useRouter();
  const links = [
    { name: 'Home', Icon: Home, link: '/teacher-dashboard' },
    { name: 'Assignments', Icon: ListChecks, link: '/teacher-dashboard/teachers-assignment-hub' },
    { name: 'Lesson Planner', Icon: BookOpenCheck, link: '/teacher-dashboard/lesson-planner' },
    { name: 'Quiz Builder', Icon: LayoutGrid, link: '/teacher-dashboard/quiz-builder' },
    { name: 'Student Manager', Icon: PencilRuler, link: '/teacher-dashboard/student-manager' },
    { name: 'Overview', Icon: LineChart, link: '/teacher-dashboard/overview' },
    { name: 'Class Calendar', Icon: BookOpen, link: '/teacher-dashboard/class-calendar' },
  ];

  return (
    <aside className="bg-white border-r border-gray-200 w-64 hidden md:block">
      <nav className="p-4 space-y-4">
        <Link href="/teacher-dashboard" className="flex items-center gap-2 text-xl font-bold">
          <Code className="w-6 h-6" /> Learn Hub
        </Link>
        {links.map(({ name, Icon, link }) => (
          <Link
            key={name}
            href={link}
            className="flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-100"
          >
            <Icon className="w-5 h-5" /> {name}
          </Link>
        ))}
        <Separator />
        <Button
          variant="ghost"
          onClick={() => signOut(auth!)}
          className="w-full justify-start"
        >
          <LogOut className="w-4 h-4 mr-2" /> Log Out
        </Button>
      </nav>
    </aside>
  );
}

export default function TeacherDashboardPage() {
  const { user, userType, userClass } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [errorTasks, setErrorTasks] = useState<string | null>(null);

  const [pendingAssignments, setPendingAssignments] = useState(0);
  const [overdueSubmissions, setOverdueSubmissions] = useState(0);
  const [avgClassProgress, setAvgClassProgress] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState(0);


  // Redirect non-teachers to login
  useEffect(() => {
    if (userType !== "teacher") {
      router.push("/login");
      return;
    }
  }, [userType, router]);

  useEffect(() => {
    if (!user || !userClass) {
      setLoadingTasks(false);
      return;
    }

    const fetchAssignments = async () => {
      const col = collection(db, "assignments");
      const q = query(col, where('assignedTo.classId', '==', userClass));

      const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map((d) => {
          const raw = d.data() as DocumentData;
          return {
            id: d.id,
            title: raw.title,
            description: raw.description,
            type: raw.type,
            dueDate: raw.dueDate.toDate(),
          } as Assignment;
        });
        setAssignments(data);
        setLoadingTasks(false);
      }, (err) => {
        setErrorTasks(err.message);
        setLoadingTasks(false);
      });

      return () => unsub();
    };

    const fetchStudentData = async () => {
      const studentsQuery = query(collection(db, "users"), where("class", "==", userClass), where("role", "==", "student"));
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentsData = studentsSnapshot.docs.map(doc => doc.data());
      const totalStudents = studentsData.length;
      const totalProgress = studentsData.reduce((acc, student: any) => acc + (student.progress || 0), 0);
      const averageProgress = totalStudents > 0 ? totalProgress / totalStudents : 0;

      setAvgClassProgress(averageProgress);
    };
    
     const fetchEvents = async () => {
      const eventsCollection = collection(db, 'classes', userClass, 'events');
      const eventsQuery = query(eventsCollection);
      const eventsSnapshot = await getDocs(eventsQuery);
      setUpcomingEvents(eventsSnapshot.docs.length);
    };
    
    const fetchSubmissions = async () => {
      let pending = 0;
      let overdue = 0;

      const assignmentsQuery = query(collection(db, "assignments"), where("createdBy", "==", user.uid), where("assignedTo.classId", "==", userClass));
      const assignmentsSnapshot = await getDocs(assignmentsQuery);

      for (const assignmentDoc of assignmentsSnapshot.docs) {
        const assignmentData = assignmentDoc.data();
        const submissionsCollection = collection(db, 'assignments', assignmentDoc.id, 'submissions');
        const submissionsSnapshot = await getDocs(submissionsCollection);

        pending += assignmentData.assignedTo.studentIds.length - submissionsSnapshot.docs.length;

        submissionsSnapshot.docs.forEach(submissionDoc => {
          const submissionData = submissionDoc.data();
          if (assignmentData.dueDate && assignmentData.dueDate.toDate() < new Date() && submissionData.status !== 'Submitted') {
            overdue++;
          }
        });
      }

      setPendingAssignments(pending);
      setOverdueSubmissions(overdue);
    };

    fetchAssignments();
    fetchStudentData();
    fetchEvents();
    fetchSubmissions();
  }, [user, userClass, router]);

  const handleSearch = () => {
    router.push(`/teacher-dashboard?search=${encodeURIComponent(searchQuery)}`);
  };

  if (!user || userType !== "teacher") {
    return (
      <div className="flex items-center justify-center min-h-screen">
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
                <span>{avgClassProgress.toFixed(2)}%</span>
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
          ) : assignments.length > 0 ? (
            <ul className="divide-y">
              {assignments.map((t) => (
                <li
                  key={t.id}
                  className="py-2 flex justify-between items-center"
                >
                  <span>{t.title}</span>
                  <Badge>{format(t.dueDate, "dd/MM/yyyy")}</Badge>
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
