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

export default function StudentDashboardPage() {
  const { user, userClass, userType, signOut: contextSignOut } = useAuth();
  const router = useRouter();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [dueTodayCount, setDueTodayCount] = useState<number>(0); // State for tasks due today

  // Redirect non-students or unauthenticated users
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (userType && userType !== 'student') {
      router.push('/login'); // Redirect teachers to their dashboard or login
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

    // Assignments Listener
    const assignmentsQuery = query(
      collection(db, 'assignments'),
      where('assignedTo.classId', '==', userClass)
      // Consider adding orderBy('dueDate', 'asc') if needed
    );

    const unsubAssignments = onSnapshot(assignmentsQuery, (snap) => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      let countDueToday = 0;
      const assignmentsData: Assignment[] = [];

      snap.docs.forEach(doc => {
        const d = doc.data() as DocumentData;
        let dueDate: Date | null = null;

        if (d.dueDate instanceof Timestamp) {
          dueDate = d.dueDate.toDate();
        } else if (d.dueDate instanceof Date) {
          dueDate = d.dueDate;
        } else if (typeof d.dueDate === 'string') {
          try {
            dueDate = new Date(d.dueDate);
          } catch (e) {
            console.warn(`Invalid date format for assignment ${doc.id}: ${d.dueDate}`);
          }
        } else if (d.dueDate?.seconds) { // Handle Firestore timestamp objects
          dueDate = new Timestamp(d.dueDate.seconds, d.dueDate.nanoseconds).toDate();
        }

        if (dueDate instanceof Date && !isNaN(dueDate.getTime())) {
          const assignment: Assignment = {
            id: doc.id,
            title: d.title || 'Untitled Assignment',
            description: d.description || '',
            type: d.type || 'Other',
            dueDate: dueDate,
            assignedTo: d.assignedTo || { classId: userClass, studentIds: [] },
          };

          assignmentsData.push(assignment);

          // Check if assignment is due today
          if (dueDate >= todayStart && dueDate < todayEnd) {
            countDueToday++;
          }
        } else {
          console.warn(`Skipping assignment ${doc.id} due to invalid or missing dueDate`);
        }
      });

      // Fetch submission status for each assignment to filter out submitted ones (Optional, but recommended)
      // You might need another query here or adjust the MyAssignments component logic

      setAssignments(assignmentsData); // Store all valid assignments
      setDueTodayCount(countDueToday); // Update the count for tasks due today
      setLoadingTasks(false);
    }, (error) => {
      console.error("Error fetching assignments:", error);
      setLoadingTasks(false);
      // Optionally set an error state here
    });

    // Progress Fetch (using getGrades which should exist in firebase.ts)
    // This assumes getGrades fetches from Users/{uid}/grades
    const fetchGrades = async () => {
      try {
        const gradesRef = collection(db, 'Users', user.uid, 'grades');
        const gradesSnap = await getDocs(gradesRef);
        const gradesData = gradesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GradeData));

        if (gradesData.length > 0) {
          const validScores = gradesData.map(g => g.score).filter(s => typeof s === 'number' && !isNaN(s));
          const avg = validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : 0;
          setOverallProgress(avg);
        } else {
          setOverallProgress(0);
        }
      } catch (error) {
        console.error("Error fetching grades:", error);
        setOverallProgress(0);
      } finally {
        setLoadingProgress(false);
      }
    };

    fetchGrades();

    // Cleanup listener on unmount
    return () => {
      unsubAssignments();
    };
  }, [user, userClass, userType]);


  const handleLogout = async () => {
    await contextSignOut(); // Call signOut from context
    router.push('/login');
  };

  // Determine greeting
  const getGreeting = () => {
    if (!user) return 'Student';
    return user.displayName || user.email?.split('@')[0] || 'Student';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navbar */}
      <header className="bg-white shadow-sm sticky top-0 z-40 border-b border-gray-200">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/student-dashboard" className="flex items-center text-indigo-600 font-bold text-xl">
            <BrainCircuit className="mr-2 h-6 w-6" /> EduAI
          </Link>
          <nav className="hidden md:flex space-x-2">
             {[
              { icon: Home, label: 'Home', href: '/student-dashboard' },
              { icon: ListChecks, label: 'Assignments', href: '/student-dashboard/my-assignments' },
              { icon: BookCopy, label: 'Flashcards', href: '/student-dashboard/flashcards' },
              { icon: LayoutGrid, label: 'MCQs', href: '/student-dashboard/mcq' },
              { icon: PencilRuler, label: 'Essay', href: '/student-dashboard/essay-feedback' },
              { icon: LineChart, label: 'Progress', href: '/student-dashboard/progress' },
              { icon: BookOpen, label: 'Learning Path', href: '/student-dashboard/learning-path' },
             ].map(({ icon: Icon, label, href }) => (
              <Button key={label} variant="ghost" size="sm" asChild className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50">
                <Link href={href}>
                  <Icon className="mr-1.5 h-4 w-4" /> {label}
                </Link>
              </Button>
            ))}
          </nav>
          <div className="flex items-center space-x-3">
            {/* <Button variant="ghost" size="icon" className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50">
              <Bell size={20} />
              <span className="sr-only">Notifications</span>
            </Button> */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                   <Avatar className="h-8 w-8">
                     <AvatarImage src={user?.photoURL || undefined} alt="User Avatar" data-ai-hint="user avatar" />
                     <AvatarFallback>{getGreeting().charAt(0).toUpperCase()}</AvatarFallback>
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
                {/* <DropdownMenuItem onClick={() => router.push('/student-dashboard/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/student-dashboard/help')}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Help</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator /> */}
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Mobile Menu Trigger */}
            {/* <Button variant="ghost" size="icon" className="md:hidden text-gray-500 hover:text-indigo-600 hover:bg-indigo-50">
              <Menu size={20} />
              <span className="sr-only">Toggle Menu</span>
            </Button> */}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-1">Welcome back, {getGreeting()}!</h1>
          <p className="text-gray-600">Here's your learning dashboard for today.</p>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200">
             <CardHeader className="pb-2">
               <CardTitle className="text-base font-medium text-gray-500">Tasks Due Today</CardTitle>
             </CardHeader>
             <CardContent>
               <p className="text-4xl font-semibold text-indigo-600">
                 {loadingTasks ? (
                    <span className="animate-pulse">...</span>
                 ) : (
                   dueTodayCount
                 )}
               </p>
               <Button variant="link" size="sm" className="px-0 text-indigo-600" onClick={() => router.push('/student-dashboard/my-assignments')}>
                 View tasks &rarr;
               </Button>
             </CardContent>
           </Card>
           <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200">
             <CardHeader className="pb-2">
               <CardTitle className="text-base font-medium text-gray-500">Overall Progress</CardTitle>
             </CardHeader>
             <CardContent>
               {loadingProgress ? (
                 <p className="text-4xl font-semibold text-gray-400 animate-pulse">...</p>
               ) : (
                 <p className="text-4xl font-semibold text-green-600">{overallProgress.toFixed(1)}%</p>
               )}
               <Progress value={loadingProgress ? 0 : overallProgress} className="mt-3 h-2" />
               <Button variant="link" size="sm" className="px-0 text-indigo-600 mt-1" onClick={() => router.push('/student-dashboard/progress')}>
                 View progress details &rarr;
               </Button>
             </CardContent>
           </Card>
            {/* AI Tutor Tip Card - Removed as AI Tutor is now a floating button */}
        </div>

        {/* Main Content Area - My Assignments */}
        <section className="mt-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
           <h2 className="text-2xl font-semibold mb-4 text-gray-800">My Assignments</h2>
          {/* Embedding the MyAssignments component directly */}
          <MyAssignments />
        </section>

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
};

    