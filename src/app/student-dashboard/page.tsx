'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { collection, query, onSnapshot, where, DocumentData, Timestamp, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { format, isPast } from 'date-fns';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import MyAssignments from './my-assignments/page'; // Ensure this path is correct
import AITutorPage from './ai-tutor/page'; // Ensure this path is correct
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
  BookOpenCheck,
  CalendarDays,
  Lightbulb,
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

// Type guard to check if a value is a Firestore Timestamp
function isTimestamp(value: any): value is Timestamp {
 return typeof value === 'object' && value !== null && value instanceof Timestamp;
}

export default function StudentDashboardPage() {
  const { user, userClass, loading: authLoading, signOut } = useAuth(); // Added signOut
  const router = useRouter();
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [dueTodayCount, setDueTodayCount] = useState<number>(0); // State for tasks due today
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [chatOpen, setChatOpen] = useState(false); // AI Tutor chat state

  // Fetch assignments and progress - Adjusted logic
  useEffect(() => {
    if (authLoading || !user || !userClass) { // Wait for auth and ensure user/class exist
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
      // Add filtering for specific student ID if necessary: where('assignedTo.studentIds', 'array-contains', user.uid)
    );

    const unsubAssignments = onSnapshot(assignmentsQuery, async (snap) => {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      let countDueToday = 0;
      const assignmentsData: Assignment[] = [];
      const submissionPromises: Promise<{ id: string; submitted: boolean }>[] = [];


       // Iterate through assignments to fetch submission status
      for (const docSnap of snap.docs) {
        const d = docSnap.data() as DocumentData;
        let dueDate: Date | null = null;
        dueDate = isTimestamp(d.dueDate) ? d.dueDate.toDate() : (d.dueDate instanceof Date ? d.dueDate : null);

        if (dueDate instanceof Date && !isNaN(dueDate.getTime())) {
          const assignment: Assignment = {
            id: docSnap.id,
            title: d.title || 'Untitled Assignment',
            description: d.description || '',
            type: d.type || 'Other',
            dueDate: dueDate,
            assignedTo: d.assignedTo || { classId: userClass, studentIds: [] },
          };

          assignmentsData.push(assignment); // Add assignment first

          // Check if due today (before filtering submitted)
          if (dueDate >= todayStart && dueDate < todayEnd) {
        // Fetch submission status for this assignment
            const subRef = doc(db, 'assignments', assignment.id, 'submissions', user.uid);
            submissionPromises.push(
              getDoc(subRef).then(subSnap => ({ id: assignment.id, submitted: subSnap.exists() && subSnap.data()?.status === 'Submitted' }))
            );
          }
        } else {
          console.warn(`Skipping assignment ${docSnap.id} due to invalid dueDate`);
        }
      }

       // Wait for all submission checks
      const submissionResults = await Promise.all(submissionPromises);
      const submittedIds = new Set(submissionResults.filter(s => s.submitted).map(s => s.id));

       // Filter assignments due today that are NOT submitted
      countDueToday = assignmentsData.filter(a => {
        const isDueToday = a.dueDate >= todayStart && a.dueDate < todayEnd;
        return isDueToday && !submittedIds.has(a.id);
      }).length;


      setAssignments(assignmentsData); // Store all valid assignments for potential display elsewhere
      setDueTodayCount(countDueToday); // Update count of *unsubmitted* tasks due today
      setLoadingTasks(false);
    }, (error) => {
      console.error("Error fetching assignments:", error);
      setLoadingTasks(false);
    });


    // Fetch Overall Progress
    const fetchGrades = async () => {
      if (!user) return;
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
  }, [user, userClass, authLoading]); // Depend on authLoading as well


  // Determine greeting
  const getGreeting = () => {
    if (!user) return 'Student';
    return user.displayName || user.email?.split('@')[0] || 'Student';
  };

  // Placeholder for handling logout
  const handleLogout = async () => {
    await signOut(); // Call signOut from context
    // router.push('/login'); // Redirect is handled by AuthProvider
  };

    // Determine initials for Avatar fallback
    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();
    };


  // Main render logic
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loader"></span>
      </div>
    );
  }

  if (!user) {
    // This shouldn't ideally be reached due to layout redirects, but as a safeguard
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting to login...</p>
      </div>
    );
  }

    return (
      <div className="container mx-auto py-8 px-4"> {/* Added padding */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-1">Welcome back, {getGreeting()}!</h1>
            <p className="text-gray-600">Here's your learning dashboard for today.</p>
          </motion.div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200">
               <CardHeader className="pb-2">
                 <CardTitle className="text-base font-medium text-gray-500 flex items-center">
                     <CalendarDays className="mr-2 h-4 w-4 text-indigo-500"/> Tasks Due Today
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <p className="text-4xl font-semibold text-indigo-600">
                   {loadingTasks ? (
                      <span className="text-gray-400 animate-pulse">...</span> // Simple loading indicator
                   ) : (
                     dueTodayCount
                   )}
                 </p>
                 <Button variant="link" size="sm" className="px-0 text-indigo-600 mt-1" onClick={() => router.push('/student-dashboard/my-assignments')}>
                   View tasks &rarr;
                 </Button>
               </CardContent>
             </Card>
             <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200">
               <CardHeader className="pb-2">
                 <CardTitle className="text-base font-medium text-gray-500 flex items-center">
                     <LineChart className="mr-2 h-4 w-4 text-green-500"/> Overall Progress
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 {loadingProgress ? (
                   <p className="text-4xl font-semibold text-gray-400 animate-pulse">...%</p>
                 ) : (
                   <p className="text-4xl font-semibold text-green-600">{overallProgress.toFixed(1)}%</p>
                 )}
                 <Progress value={loadingProgress ? 0 : overallProgress} className="mt-3 h-2" />
                 <Button variant="link" size="sm" className="px-0 text-indigo-600 mt-1" onClick={() => router.push('/student-dashboard/progress')}>
                   View progress details &rarr;
                 </Button>
               </CardContent>
             </Card>
             {/* AI Tutor Tip Card - Removed as AI Tutor is now floating button */}
              {/* <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                 <CardHeader className="pb-2">
                   <CardTitle className="text-base font-medium text-gray-500 flex items-center">
                      <Lightbulb className="mr-2 h-4 w-4 text-yellow-500"/> AI Tutor Tip
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                     <p className="text-sm text-gray-700 mb-3">
                       "Stuck on Algebra? Ask me: 'Explain the quadratic formula step-by-step'!"
                     </p>
                 </CardContent>
              </Card> */}
          </div>

          {/* Main Content Area - Quick Links or Recent Activity */}
          <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Example: Continue Learning Section */}
               <Card className="shadow-sm border border-gray-200">
                   <CardHeader>
                       <CardTitle className="flex items-center"><BookOpenCheck className="mr-2 h-5 w-5 text-blue-500"/> Continue Learning</CardTitle>
                       <CardDescription>Pick up where you left off.</CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-3">
                       {/* Replace with dynamic course data */}
                       <div className="flex items-center justify-between">
                           <span>Mathematics</span>
                           <Button size="sm" variant="outline" onClick={() => router.push('/student-dashboard/mathematics')}>Continue</Button>
                       </div>
                       <div className="flex items-center justify-between">
                           <span>Data Science</span>
                           <Button size="sm" variant="outline" onClick={() => router.push('/student-dashboard/data-science')}>Continue</Button>
                       </div>
                        {/* Add buttons for Programming and Machine Learning if needed */}
                         <div className="flex items-center justify-between">
                            <span>Programming</span>
                            <Button size="sm" variant="outline" onClick={() => router.push('/student-dashboard/programming')}>Continue</Button>
                        </div>
                         <div className="flex items-center justify-between">
                            <span>Machine Learning</span>
                            <Button size="sm" variant="outline" onClick={() => router.push('/student-dashboard/machine-learning')}>Continue</Button>
                        </div>
                   </CardContent>
               </Card>

                {/* Example: Upcoming Assignments */}
                <Card className="shadow-sm border border-gray-200">
                   <CardHeader>
                       <CardTitle className="flex items-center"><ListChecks className="mr-2 h-5 w-5 text-orange-500"/> Upcoming Assignments</CardTitle>
                       <CardDescription>Stay on top of your deadlines.</CardDescription>
                   </CardHeader>
                   <CardContent>
                       {loadingTasks ? <p>Loading...</p> : assignments.slice(0, 3).map(a => ( // Show top 3
                           <div key={a.id} className="flex items-center justify-between text-sm py-1 border-b last:border-b-0">
                               <span>{a.title} ({a.type})</span>
                               <span className="text-muted-foreground">{format(isTimestamp(a.dueDate) ? a.dueDate.toDate() : a.dueDate, 'MMM dd')}</span>
                           </div>
                       ))}
                       {assignments.length === 0 && !loadingTasks && <p>No upcoming assignments.</p>}
                        {assignments.length > 3 &&
                          <Button variant="link" size="sm" className="px-0 mt-2" onClick={() => router.push('/student-dashboard/my-assignments')}>View all &rarr;</Button>
                        }
                   </CardContent>
               </Card>
          </section>

          {/* AI Tutor Floating Button - Moved to layout */}
          {/* Fixed AI Tutor Button and Panel Container */}
          {/* <div className="fixed bottom-6 right-6 z-50">
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
           </div> */}
      </div>
  );
}

    