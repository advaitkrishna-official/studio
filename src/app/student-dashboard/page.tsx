
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { motion } from 'framer-motion';
import { collection, query, onSnapshot, where, DocumentData, Timestamp, getDocs } from 'firebase/firestore';
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
import MyAssignments from './my-assignments/page'; // Ensure this path is correct
import AITutorPage from './ai-tutor/page'; // Ensure this path is correct
import { Progress } from '@/components/ui/progress';
import {
  BookOpenCheck, // Changed icon for courses
  CalendarDays, // Changed icon for calendar
  Lightbulb, // Changed icon for AI tip
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
  const { user, userClass, loading: authLoading } = useAuth(); // Removed userType as it's checked in layout
  const router = useRouter(); // Added router import
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [dueTodayCount, setDueTodayCount] = useState<number>(0); // State for tasks due today

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

        // Handle various date formats from Firestore
        if (d.dueDate instanceof Timestamp) dueDate = d.dueDate.toDate();
        else if (d.dueDate instanceof Date) dueDate = d.dueDate;
        else if (typeof d.dueDate === 'string') try { dueDate = new Date(d.dueDate); } catch (e) { console.warn(`Invalid date: ${d.dueDate}`); }
        else if (d.dueDate?.seconds) dueDate = new Timestamp(d.dueDate.seconds, d.dueDate.nanoseconds).toDate();

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


  return (
      // Removed the outer div and navbar/header - handled by layout.tsx
      <>
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
                    {/* Button removed, AI Tutor is now floating */}
               </CardContent>
            </Card>
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
                         <span>Mathematics - Algebra Basics</span>
                         <Button size="sm" variant="outline" onClick={() => router.push('/student-dashboard/mathematics')}>Continue</Button>
                     </div>
                     <div className="flex items-center justify-between">
                         <span>Data Science Fundamentals</span>
                         <Button size="sm" variant="outline" onClick={() => router.push('/student-dashboard/data-science')}>Continue</Button>
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
                             <span className="text-muted-foreground">{format(a.dueDate, 'MMM dd')}</span>
                         </div>
                     ))}
                      {assignments.length === 0 && !loadingTasks && <p>No upcoming assignments.</p>}
                      {assignments.length > 3 &&
                        <Button variant="link" size="sm" className="px-0 mt-2" onClick={() => router.push('/student-dashboard/my-assignments')}>View all &rarr;</Button>
                      }
                 </CardContent>
             </Card>
        </section>
      </>
    );
};
