'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { collection, query, onSnapshot, where, DocumentData, Timestamp, getDocs, doc, getDoc, orderBy } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { format, isPast, isToday } from 'date-fns';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  BookOpenCheck,
  CalendarDays,
  Lightbulb,
  LineChart,
  ListChecks
} from 'lucide-react';
import { isTimestamp } from '@/lib/utils'; // Import the type guard

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

// Type guard to check if a value is a Firestore Timestamp - Moved outside component
// function isTimestamp(value: any): value is Timestamp {
//  return typeof value === 'object' && value !== null && value instanceof Timestamp;
// }

export default function StudentDashboardPage() {
  const { user, userClass, loading: authLoading, signOut } = useAuth(); // Added signOut
  const router = useRouter();
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [dueTodayCount, setDueTodayCount] = useState<number>(0); // State for tasks due today
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [chatOpen, setChatOpen] = useState(false); // AI Tutor chat state - Keep if AI tutor is floating button in layout

  // Fetch assignments and progress - Adjusted logic
  useEffect(() => {
    if (authLoading || !user || !userClass) { // Wait for auth and ensure user/class exist
      setLoadingTasks(false);
      setLoadingProgress(false);
      setAssignments([]); // Clear assignments if no user/class
      setDueTodayCount(0);
      setOverallProgress(0);
      console.log("Auth loading or user/class missing, skipping fetch.");
      return;
    }
    console.log("Starting useEffect for data fetch...");
    setLoadingTasks(true);
    setLoadingProgress(true);

    // Assignments Listener
    const assignmentsQuery = query(
      collection(db, 'assignments'),
      where('assignedTo.classId', '==', userClass)
      // No longer ordering here, sort client-side after fetching submissions
    );

    const unsubAssignments = onSnapshot(assignmentsQuery, async (snap) => {
       console.log(`Assignments snapshot received: ${snap.size} docs for class ${userClass}`);
       const now = new Date();
       let countDueToday = 0;
       const assignmentsData: Assignment[] = [];
       const submissionChecks: Promise<boolean>[] = []; // Promises to check submission status

        for (const docSnap of snap.docs) {
          const d = docSnap.data() as DocumentData;
          const isAssignedToUser = !d.assignedTo?.studentIds || d.assignedTo.studentIds.length === 0 || d.assignedTo.studentIds.includes(user.uid);

          if (isAssignedToUser) {
              let dueDate: Date | null = null;
              if (d.dueDate && isTimestamp(d.dueDate)) {
                  dueDate = d.dueDate.toDate();
              } else if (d.dueDate instanceof Date && !isNaN(d.dueDate.getTime())) {
                  dueDate = d.dueDate;
              }

              if (dueDate) {
                 const assignment: Assignment = {
                    id: docSnap.id,
                    title: d.title || 'Untitled Assignment',
                    description: d.description || '',
                    type: d.type || 'Other',
                    dueDate: dueDate,
                    assignedTo: d.assignedTo || { classId: userClass, studentIds: [] },
                  };
                  assignmentsData.push(assignment);

                  // Check if due today AND check submission status
                  if (isToday(dueDate)) {
                    const subRef = doc(db, 'assignments', assignment.id, 'submissions', user.uid);
                    submissionChecks.push(
                      getDoc(subRef).then(subSnap => {
                        const isSubmitted = subSnap.exists() && (subSnap.data()?.status === 'Submitted' || subSnap.data()?.status === 'Graded');
                        console.log(`Assignment ${assignment.id} due today. Submitted: ${isSubmitted}`);
                        return !isSubmitted; // Return true if NOT submitted (counts towards dueTodayCount)
                      }).catch(err => {
                          console.error(`Error checking submission for ${assignment.id}:`, err);
                          return false; // Assume submitted or error if check fails
                      })
                    );
                  }
              } else {
                  console.warn(`Skipping assignment ${docSnap.id} due to invalid dueDate:`, d.dueDate);
              }
          }
        }

        // Wait for all submission checks to complete
        const dueTodayResults = await Promise.all(submissionChecks);
        countDueToday = dueTodayResults.filter(isDue).length; // Count how many returned true (are due today and not submitted)

        console.log(`Calculated dueTodayCount: ${countDueToday}`);

        setAssignments(assignmentsData.sort((a, b) => {
            const dateA = a.dueDate instanceof Date ? a.dueDate.getTime() : 0;
            const dateB = b.dueDate instanceof Date ? b.dueDate.getTime() : 0;
            return dateA - dateB;
        }));
        setDueTodayCount(countDueToday);
        setLoadingTasks(false);
        console.log("Assignments fetch and due today calculation complete.");

    }, (error) => {
      console.error("Error fetching assignments:", error);
      setLoadingTasks(false);
      setAssignments([]); // Clear assignments on error
      setDueTodayCount(0);
    });


    // Fetch Overall Progress
    const fetchGrades = async () => {
      if (!user) return;
      setLoadingProgress(true); // Ensure loading starts
      console.log("Fetching grades for progress calculation...");
      try {
        const gradesRef = collection(db, 'Users', user.uid, 'grades');
        const gradesSnap = await getDocs(gradesRef);
        const gradesData = gradesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GradeData));
        console.log(`Fetched ${gradesData.length} grades.`);

        if (gradesData.length > 0) {
          const validScores = gradesData.map(g => g.score).filter(s => typeof s === 'number' && !isNaN(s));
          const avg = validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : 0;
          setOverallProgress(Math.min(100, Math.max(0, avg))); // Cap progress between 0 and 100
          console.log(`Calculated overall progress: ${avg}`);
        } else {
          setOverallProgress(0);
          console.log("No valid grades found, progress set to 0.");
        }
      } catch (error) {
        console.error("Error fetching grades:", error);
        setOverallProgress(0); // Reset progress on error
      } finally {
        setLoadingProgress(false);
        console.log("Grade fetching complete.");
      }
    };

    fetchGrades();

    // Cleanup listener on unmount
    return () => {
      console.log("Cleaning up assignments listener.");
      unsubAssignments();
    };
  }, [user, userClass, authLoading]); // Depend on authLoading as well


  // Determine greeting
  const getGreeting = () => {
    if (!user) return 'Student';
    return user.displayName || user.email?.split('@')[0] || 'Student';
  };


  // Main render logic
  if (authLoading && !user) { // Improved loading check
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-100">
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
             {/* AI Tutor Tip Card */}
              <Card className="shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                 <CardHeader className="pb-2">
                   <CardTitle className="text-base font-medium text-gray-500 flex items-center">
                      <Lightbulb className="mr-2 h-4 w-4 text-yellow-500"/> AI Tutor Tip
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                     <p className="text-sm text-gray-700 mb-3">
                       "Stuck on Algebra? Ask me: 'Explain the quadratic formula step-by-step'!"
                     </p>
                     {/* Removed the "Ask AI Tutor" button as the tutor is now a floating chat */}
                 </CardContent>
              </Card>
          </div>

          {/* Main Content Area - Quick Links or Recent Activity */}
          <section className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Continue Learning Section - Only Programming */}
               <Card className="shadow-sm border border-gray-200">
                   <CardHeader>
                       <CardTitle className="flex items-center"><BookOpenCheck className="mr-2 h-5 w-5 text-blue-500"/> Continue Learning</CardTitle>
                       <CardDescription>Pick up where you left off.</CardDescription>
                   </CardHeader>
                   <CardContent className="space-y-3">
                       <div className="flex items-center justify-between">
                            <span>Programming</span>
                            <Button size="sm" variant="outline" onClick={() => router.push('/student-dashboard/programming')}>Continue</Button>
                        </div>
                   </CardContent>
               </Card>

                {/* Upcoming Assignments */}
                <Card className="shadow-sm border border-gray-200">
                   <CardHeader>
                       <CardTitle className="flex items-center"><ListChecks className="mr-2 h-5 w-5 text-orange-500"/> Upcoming Assignments</CardTitle>
                       <CardDescription>Stay on top of your deadlines.</CardDescription>
                   </CardHeader>
                   <CardContent>
                       {loadingTasks ? <p>Loading...</p> : assignments.slice(0, 3).map(a => ( // Show top 3 upcoming
                           <div key={a.id} className="flex items-center justify-between text-sm py-1 border-b last:border-b-0">
                               <span>{a.title} ({a.type})</span>
                               <span className="text-muted-foreground">{format(a.dueDate instanceof Date ? a.dueDate : new Date(), 'MMM dd')}</span>
                           </div>
                       ))}
                       {assignments.length === 0 && !loadingTasks && <p>No upcoming assignments.</p>}
                        {assignments.length > 3 &&
                          <Button variant="link" size="sm" className="px-0 mt-2" onClick={() => router.push('/student-dashboard/my-assignments')}>View all &rarr;</Button>
                        }
                   </CardContent>
               </Card>
          </section>

      </div>
  );
}
