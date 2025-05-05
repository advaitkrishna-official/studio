'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth-provider';
import { auth, db, getGrades } from '@/lib/firebase';
import { collection, query, onSnapshot, where, DocumentData, Timestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { format } from 'date-fns';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MyAssignments from './my-assignments/page';
import AITutorPage from './ai-tutor/page';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Menu,
  Home,
  ListChecks,
  BookCopy,
  LayoutGrid,
  PencilRuler,
  LineChart,
  BookOpen,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  Code,
  Brain,
  BrainCircuit,
} from 'lucide-react';

interface Assignment {
  id: string;
  title: string;
  description: string;
  type: string;
  dueDate: Date;
  assignedTo: { classId: string; studentIds: string[] };
}

interface GradeData {
  id: string;
  taskName: string;
  score: number;
  feedback: string;
  timestamp: Timestamp | Date;
}

export default function StudentDashboardPage() {
  const { user, userClass, userType, signOut: contextSignOut } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  // Redirect non-students or unauthenticated users
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (userType && userType !== 'student') {
      router.push('/login');
    }
  }, [user, userType, router]);

  // Fetch assignments and progress
  useEffect(() => {
    if (!user || !userClass || userType !== 'student') {
      setLoadingTasks(false);
      setLoadingProgress(false);
      return;
    }
    setLoadingTasks(true);
    setLoadingProgress(true);
    // Assignments
    const assignmentsQuery = query(
      collection(db, 'assignments'),
      where('assignedTo.classId', '==', userClass)
    );
    const unsub = onSnapshot(assignmentsQuery, snap => {
      const now = new Date();
      const data = snap.docs
        .map(doc => {
          const d = doc.data() as DocumentData;
          let due: Date | null = null;
          if (d.dueDate instanceof Timestamp) due = d.dueDate.toDate();
          else if (d.dueDate instanceof Date) due = d.dueDate;
          else if (typeof d.dueDate === 'string') due = new Date(d.dueDate);
          if (!due || isNaN(due.getTime())) return null;
          return { id: doc.id, title: d.title, description: d.description, type: d.type, dueDate: due, assignedTo: d.assignedTo } as Assignment;
        })
        .filter(Boolean) as Assignment[];
      setAssignments(data.filter(a => a.dueDate >= now || a.dueDate.toDateString() === now.toDateString()));
      setLoadingTasks(false);
    }, () => setLoadingTasks(false));

    // Progress
    getGrades(user.uid).then((grades: GradeData[]) => {
      if (grades.length) {
        const avg = grades.reduce((sum, g) => sum + g.score, 0) / grades.length;
        setOverallProgress(avg);
      } else setOverallProgress(0);
      setLoadingProgress(false);
    }).catch(() => {
      setOverallProgress(0);
      setLoadingProgress(false);
    });

    return () => unsub();
  }, [user, userClass, userType]);

  const handleLogout = async () => {
    await contextSignOut(auth);
    router.push('/login');
  };

  const greeting = user?.displayName ?? user?.email?.split('@')[0] ?? 'Student';
  const dueToday = assignments.filter(a => a.dueDate.toDateString() === new Date().toDateString()).length;

  return (
    <div className="min-h-screen bg-gray-100 relative">
      {/* Navbar */}
      <header className="bg-white shadow sticky top-0 z-40"> {/* Lower z-index */}
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/student-dashboard" className="flex items-center text-indigo-600 font-bold text-xl">
            <BrainCircuit className="mr-2" /> EduAI
          </Link>
          <nav className="hidden md:flex space-x-4">
            {[
              { icon: Home, label: 'Home', href: '/student-dashboard' },
              { icon: ListChecks, label: 'Assignments', href: '/student-dashboard/my-assignments' },
              { icon: BookCopy, label: 'Flashcards', href: '/student-dashboard/flashcards' },
              { icon: LayoutGrid, label: 'MCQs', href: '/student-dashboard/mcq' },
              { icon: PencilRuler, label: 'Essay', href: '/student-dashboard/essay-feedback' },
              { icon: LineChart, label: 'Progress', href: '/student-dashboard/progress' },
              { icon: BookOpen, label: 'Learning Path', href: '/student-dashboard/learning-path' },
            ].map(({ icon: Icon, label, href }) => (
              <Link key={label} href={href} className="flex items-center px-3 py-2 rounded hover:bg-gray-200">
                <Icon className="mr-1" size={16} /> {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon">
              <Bell size={20} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.photoURL!} alt="avatar" />
                    <AvatarFallback>{greeting.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/student-dashboard/settings')}>
                  <Settings className="mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/student-dashboard/help')}>
                  <HelpCircle className="mr-2" /> Help
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu size={20} />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-2">Welcome back, {greeting}!</h1>
          <p className="text-gray-600">Here's what's happening today.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tasks Due Today</CardTitle>
              <CardDescription>Due your attention</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold text-indigo-600">{loadingTasks ? '...' : dueToday}</p>
              <Button variant="link" size="sm" onClick={() => router.push('/student-dashboard/my-assignments')}>View tasks</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Overall Progress</CardTitle>
              <CardDescription>Your average score</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProgress ? (
                <p className="text-4xl font-semibold text-gray-400">...</p>
              ) : (
                <p className="text-4xl font-semibold text-green-600">{overallProgress.toFixed(1)}%</p>
              )}
              <Progress value={loadingProgress ? 0 : overallProgress} className="mt-2" />
              <Button variant="link" size="sm" onClick={() => router.push('/student-dashboard/progress')}>View progress</Button>
            </CardContent>
          </Card>
          {/* Removed the grid item for the tutor button */}
        </div>

        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">My Assignments</h2>
          <MyAssignments />
        </section>
      </main>

      {/* Fixed AI Tutor Button and Panel Container */}
      <div className="fixed bottom-4 right-4 z-50">
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="mb-2 w-80 h-96 bg-white shadow-lg rounded-lg overflow-hidden flex flex-col"
            style={{ maxHeight: 'calc(100vh - 80px)' }} // Ensure it doesn't overflow viewport
          >
            <div className="flex items-center justify-between bg-indigo-600 p-2">
              <span className="text-white font-semibold">AI Tutor</span>
              <button onClick={() => setChatOpen(false)} className="text-white hover:bg-indigo-700 rounded-full p-1">✕</button>
            </div>
            <div className="flex-1 overflow-auto">
              <AITutorPage />
            </div>
          </motion.div>
        )}
        <motion.button
          onClick={() => setChatOpen(o => !o)}
          className="w-16 h-16 bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-lg flex items-center justify-center text-white"
          whileTap={{ scale: 0.9 }}
          aria-label="Toggle AI Tutor Chat"
        >
          {chatOpen ? <BrainCircuit size={24} /> : <Brain size={24} />}
        </motion.button>
      </div>
    </div>
  );
};
