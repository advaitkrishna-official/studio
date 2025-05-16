
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { collection, query, onSnapshot, where, DocumentData, Timestamp, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
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
  BookText,
  GraduationCap,
  Database,
  Cpu,
  Hash,
  FileQuestion,
  FlaskConical,
  History,
} from 'lucide-react';

interface Assignment {
  id: string;
  title: string;
  description: string;
  type: string;
  dueDate: Timestamp | Date; // Accept both Timestamp and Date
  assignedTo: { classId: string; studentIds: string[] };
}

interface GradeData {
  id: string;
  taskName: string;
  score: number;
  feedback: string;
  timestamp: Timestamp | Date;
}

export default function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userClass, userType, signOut: contextSignOut } = useAuth();
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);


  // Redirect non-students or unauthenticated users
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (userType && userType !== 'student') {
      router.push('/login'); // Redirect teachers/others to login if they land here
    }
  }, [user, userType, router]);

  const handleLogout = async () => {
    await contextSignOut(); // Call signOut from context
    router.push('/login');
  };

  // Determine greeting
  const getGreeting = () => {
    if (!user) return 'Student';
    return user.displayName || user.email?.split('@')[0] || 'Student';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  // Sidebar/Navbar links
  const navLinks = [
    { icon: Home, label: 'Home', href: '/student-dashboard' },
    { icon: ListChecks, label: 'Assignments', href: '/student-dashboard/my-assignments' },
    { icon: BookCopy, label: 'Flashcards', href: '/student-dashboard/flashcards' },
    { icon: LayoutGrid, label: 'MCQs', href: '/student-dashboard/mcq' },
    { icon: BookText, label: 'Long Answer', href: '/student-dashboard/long-answer' },
    { icon: PencilRuler, label: 'Essay Feedback', href: '/student-dashboard/essay-feedback' },
    { icon: LineChart, label: 'Progress', href: '/student-dashboard/progress' },
    { icon: BookOpen, label: 'Learning Path', href: '/student-dashboard/learning-path' },
    // Add other subject links if needed, e.g.:
    // { icon: FlaskConical, label: 'Data Science', href: '/student-dashboard/data-science' },
    // { icon: Code, label: 'Programming', href: '/student-dashboard/programming' },
    // { icon: BrainCircuit, label: 'Machine Learning', href: '/student-dashboard/machine-learning' },
    // { icon: History, label: 'Mathematics', href: '/student-dashboard/mathematics' },
  ];


  if (!user || userType !== 'student') {
    // Show loading indicator or redirect
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loader"></span>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex flex-col">
      {/* Navbar */}
      <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-200">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center text-indigo-600 font-bold text-xl">
            <GraduationCap className="mr-2 h-6 w-6" /> EduAI
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map(({ icon: Icon, label, href }) => (
              <Button key={label} variant="ghost" size="sm" asChild className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50">
                <Link href={href}>
                  <Icon className="mr-1.5 h-4 w-4" /> {label}
                </Link>
              </Button>
            ))}
          </nav>

          {/* Right side: User Menu & Mobile Menu */}
          <div className="flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9 border-2 border-indigo-100">
                    <AvatarImage src={user?.photoURL || undefined} alt="User Avatar" data-ai-hint="user avatar" />
                    <AvatarFallback className="bg-indigo-100 text-indigo-600 font-semibold">
                      {getInitials(getGreeting())}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{getGreeting()}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                 <DropdownMenuItem onClick={() => router.push('/student-dashboard/settings')}> {/* Example settings link */}
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={() => router.push('/student-dashboard/help')}> {/* Example help link */}
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Help</span>
                  </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Trigger */}
            <DropdownMenu>
               <DropdownMenuTrigger asChild className="md:hidden">
                   <Button variant="ghost" size="icon">
                       <Menu className="h-5 w-5" />
                   </Button>
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end" className="w-56">
                   <DropdownMenuLabel>Navigation</DropdownMenuLabel>
                   <DropdownMenuSeparator />
                    {navLinks.map(({ icon: Icon, label, href }) => (
                      <DropdownMenuItem key={label} onClick={() => router.push(href)}>
                        <Icon className="mr-2 h-4 w-4" />
                        <span>{label}</span>
                      </DropdownMenuItem>
                    ))}
               </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow container mx-auto px-4 py-8">
         {children} {/* Render the specific page content here */}
      </main>

      {/* Fixed AI Tutor Button and Panel Container */}
       <div className="fixed bottom-6 right-6 z-50">
         {chatOpen && (
           <motion.div
             initial={{ opacity: 0, y: 50, scale: 0.9 }}
             animate={{ opacity: 1, y: 0, scale: 1 }}
             exit={{ opacity: 0, y: 50, scale: 0.9 }}
             transition={{ type: "spring", stiffness: 300, damping: 25 }}
             className="mb-2 w-80 h-96 bg-white shadow-xl rounded-lg border border-gray-200 overflow-hidden flex flex-col"
             style={{ maxHeight: 'calc(100vh - 90px)' }} // Ensure it doesn't overflow viewport significantly
           >
             <div className="flex items-center justify-between bg-indigo-600 p-2 text-white">
               <span className="font-semibold text-sm ml-1">AI Tutor</span>
               <button onClick={() => setChatOpen(false)} className="text-indigo-100 hover:text-white hover:bg-indigo-700 rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-white">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
             </div>
             {/* Embedding AITutorPage - ensure it fits */}
             <div className="flex-1 overflow-auto">
               <AITutorPage />
             </div>
           </motion.div>
         )}
         <motion.button
           onClick={() => setChatOpen(o => !o)}
           className={`w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
             chatOpen ? 'bg-indigo-700 hover:bg-indigo-800' : 'bg-indigo-600 hover:bg-indigo-700'
           }`}
           whileHover={{ scale: 1.1 }}
           whileTap={{ scale: 0.95 }}
           aria-label="Toggle AI Tutor Chat"
         >
           {chatOpen ? <BrainCircuit size={28} /> : <Brain size={28} />}
         </motion.button>
       </div>
    </div>
  );
}
