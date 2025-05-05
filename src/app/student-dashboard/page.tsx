'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth-provider';
import { auth, db } from '@/lib/firebase';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Menu,
  Home,
  ListChecks,
  BookOpenCheck,
  LayoutGrid,
  PencilRuler,
  LineChart,
  BookOpen,
  LogOut,
  Code,
  Settings,
  HelpCircle,
  Bell,
  BookCopy,
  Award,
  BrainCircuit,
  Brain,
} from 'lucide-react';
import MyAssignments from './my-assignments/page'; // Import the assignments component
import AITutorPage from './ai-tutor/page'; // Import the AI Tutor component


interface Assignment {
  id: string;
  title: string;
  description: string;
  type: string;
  dueDate: Timestamp | Date; // Allow Timestamp or Date
}

export default function StudentDashboardPage() {
  const { user, userClass, userType, signOut } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect non-students or unauthenticated users
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return; // Exit early if no user
    }
    if (userType && userType !== 'student') {
      // Redirect non-students (e.g., teachers) to their respective dashboard or login
      router.push('/login'); // Or '/teacher-dashboard' if you have one
    }
  }, [user, userType, router]);


  // Fetch assignments
  useEffect(() => {
    if (!user || !userClass || userType !== 'student') {
      setLoadingTasks(false);
      return; // Exit if not a student or class is unknown
    }

    setLoadingTasks(true);
    setError(null);

    const assignmentsQuery = query(
      collection(db, 'assignments'),
      where('assignedTo.classId', '==', userClass)
    );

    const unsubscribe = onSnapshot(assignmentsQuery, (snapshot) => {
      const now = new Date();
      const fetchedAssignments = snapshot.docs
        .map(doc => {
           const data = doc.data() as DocumentData;
           let dueDate: Timestamp | Date | null = null;

           // Handle Firestore Timestamp or JS Date conversion
           if (data.dueDate) {
              if (data.dueDate instanceof Timestamp) {
                 dueDate = data.dueDate.toDate();
              } else if (data.dueDate instanceof Date) {
                 dueDate = data.dueDate;
              } else if (typeof data.dueDate === 'string') {
                 // Attempt to parse if it's a string (less ideal)
                 dueDate = new Date(data.dueDate);
              }
           }

           // Filter out assignments with invalid dates
           if (!dueDate || isNaN(dueDate.getTime())) {
              console.warn(`Invalid or missing due date for assignment: ${doc.id}`);
              return null; // Skip this assignment
           }


            return {
             id: doc.id,
             title: data.title ?? 'Untitled Assignment',
             description: data.description ?? '',
             type: data.type ?? 'Other',
             dueDate: dueDate, // Use the converted Date object
           } as Assignment;
        })
        .filter(Boolean) as Assignment[]; // Filter out nulls

        // Filter for tasks due today or later
        const upcomingOrDueAssignments = fetchedAssignments.filter(a => a.dueDate >= now || a.dueDate.toDateString() === now.toDateString());

      setAssignments(upcomingOrDueAssignments);
      setLoadingTasks(false);
    }, (err) => {
      console.error("Error fetching assignments:", err);
      setError("Failed to load assignments.");
      setLoadingTasks(false);
    });

    return () => unsubscribe(); // Clean up listener on unmount
  }, [user, userClass, userType]);


  const handleLogout = async () => {
    try {
      await signOut(auth!);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  // --- Dashboard Content ---
  const greetingName = user?.displayName ?? user?.email?.split('@')[0] ?? 'Student';
  const tasksDueToday = assignments.filter(a => a.dueDate instanceof Date && a.dueDate.toDateString() === new Date().toDateString()).length;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/student-dashboard" className="flex items-center gap-2 text-xl font-bold text-indigo-600">
            <BrainCircuit className="w-6 h-6" /> EduAI
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-4">
             <Link href="/student-dashboard" className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><Home size={16} /> Home</Link>
             <Link href="/student-dashboard/my-assignments" className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><ListChecks size={16}/> Assignments</Link>
             <Link href="/student-dashboard/flashcards" className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><BookCopy size={16}/> Flashcards</Link>
             <Link href="/student-dashboard/mcq" className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><LayoutGrid size={16}/> MCQs</Link>
             <Link href="/student-dashboard/essay-feedback" className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><PencilRuler size={16}/> Essay</Link>
             <Link href="/student-dashboard/progress" className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><LineChart size={16}/> Progress</Link>
             <Link href="/student-dashboard/learning-path" className="text-gray-600 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-1"><BookOpen size={16}/> Learning Path</Link>
             {/* Add other links similarly */}
          </nav>

          {/* Right side icons/menu */}
          <div className="flex items-center space-x-4">
             <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
                <Bell size={20} />
                <span className="sr-only">Notifications</span>
             </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.photoURL ?? undefined} alt={user?.displayName ?? "User Avatar"} data-ai-hint="user avatar" />
                    <AvatarFallback>{greetingName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/student-dashboard/settings')}> {/* Assuming a settings page */}
                   <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/student-dashboard/help')}> {/* Assuming a help page */}
                   <HelpCircle className="mr-2 h-4 w-4" /> Help
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Nav Trigger */}
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu size={20}/>
              <span className="sr-only">Open Menu</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome back, {greetingName}!</h1>
          <p className="text-gray-600">Here's what's happening today.</p>
        </motion.div>

        {/* Quick Overview Cards & AI Tutor */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left Column: Overview Cards */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Tasks Due Today</CardTitle>
                    <CardDescription>Assignments needing attention.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-4xl font-bold text-indigo-600">{tasksDueToday}</p>
                    <Button size="sm" variant="link" className="p-0 h-auto mt-2" onClick={() => router.push('/student-dashboard/my-assignments')}>View tasks</Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Overall Progress</CardTitle>
                    <CardDescription>Your average score.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Placeholder for progress bar/score - Fetch and calculate this */}
                    <p className="text-4xl font-bold text-green-600">85%</p> {/* Placeholder */}
                    <Button size="sm" variant="link" className="p-0 h-auto mt-2" onClick={() => router.push('/student-dashboard/progress')}>View progress</Button>
                  </CardContent>
                </Card>
            </div>

            {/* Right Column: AI Tutor Chat */}
            <div className="lg:col-span-1 h-[600px]"> {/* Adjust height as needed */}
              <AITutorPage />
            </div>
        </div>


        {/* My Assignments Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">My Assignments</h2>
          {/* Render the MyAssignments component directly */}
           <MyAssignments />
        </div>

        {/* Recommendations Section (Placeholder) */}
        {/* You can add logic here to fetch and display recommendations */}
        {/*
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Recommendations For You</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            // Recommendation Cards go here
          </div>
        </div>
        */}

      </main>
    </div>
  );
}