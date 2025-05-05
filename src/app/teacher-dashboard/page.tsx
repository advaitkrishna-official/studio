'use client'; // Keep this page as a client component

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  onSnapshot,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { format, isPast } from 'date-fns';
import { useAuth } from '@/components/auth-provider';
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle,
  Calendar as CalendarIcon, // Renamed CalendarIcon
  ListChecks,
  Hash,
  BookOpenCheck,
  LayoutGrid,
  User as UserIcon,
  LineChart,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { Menu } from 'lucide-react';


// Interfaces (assuming these are defined correctly)
interface Assignment {
  id: string;
  title: string;
  dueDate: Date; // AssumingdueDate is always a Date object after fetching
  type: string;
  assignedTo: { classId: string; studentIds: string[] };
}

interface Event {
  id: string;
  title: string;
  date: Date;
  description: string;
}


// Function to get initials for AvatarFallback
const getInitials = (name: string) => {
  return name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '';
};

export default function TeacherDashboardPage() {
  const { user, userType, userClass } = useAuth();
  const router = useRouter();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState(0);
  const [overdueSubmissions, setOverdueSubmissions] = useState(0);
  const [avgProgress, setAvgProgress] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [recentActivity, setRecentActivity] = useState<string[]>([]); // Example: ["Student X submitted Assignment Y", "You created Quiz Z"]
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !userClass) {
        setLoading(false); // Stop loading if no user or class context
        return;
    }

    setLoading(true);
    let isMounted = true; // Flag to prevent state updates on unmounted component

    // --- Fetch Assignments & Submissions ---
    const asgQuery = query(
      collection(db, 'assignments'),
      where('createdBy', '==', user.uid), // Fetch assignments created by this teacher
      where('assignedTo.classId', '==', userClass) // For the selected class
    );

    const unsubAssignments = onSnapshot(asgQuery, async (asgSnap) => {
      if (!isMounted) return;
      const now = new Date();
      let pendingCount = 0;
      let overdueCount = 0;
      const fetchedAssignments: Assignment[] = [];

      for (const docSnap of asgSnap.docs) {
        const data = docSnap.data() as any;
        let dueDate: Date | null = null;
         if (data.dueDate instanceof Timestamp) dueDate = data.dueDate.toDate();
         else if (data.dueDate instanceof Date) dueDate = data.dueDate; // If already a Date
         else if (typeof data.dueDate === 'string') try { dueDate = new Date(data.dueDate); } catch (e) { console.warn(`Invalid date: ${data.dueDate}`); }
         else if (data.dueDate?.seconds) dueDate = new Timestamp(data.dueDate.seconds, data.dueDate.nanoseconds).toDate();

         if (!dueDate || isNaN(dueDate.getTime())) {
            console.warn(`Skipping assignment ${docSnap.id} due to invalid dueDate:`, data.dueDate);
            continue; // Skip this assignment if date is invalid
         }

        const assignment: Assignment = {
          id: docSnap.id,
          title: data.title || 'Untitled',
          type: data.type || 'Other',
          dueDate: dueDate, // Use the converted Date object
          assignedTo: data.assignedTo,
        };
        fetchedAssignments.push(assignment);

        // Check submissions for pending/overdue status
        const submissionsRef = collection(db, 'assignments', docSnap.id, 'submissions');
        const submissionsSnap = await getDocs(submissionsRef);
        const studentIds = assignment.assignedTo?.studentIds || []; // Handle potentially missing field
        const submittedCount = submissionsSnap.size;
        let totalStudents = 0; // Initialize totalStudents

        // Attempt to fetch total students for the class
         try {
           const studentsQuery = query(collection(db, 'Users'), where('class', '==', userClass), where('role', '==', 'student'));
           const studentsSnap = await getDocs(studentsQuery);
           totalStudents = studentsSnap.size;
         } catch (error) {
           console.error("Error fetching student count:", error);
           // Handle error, maybe set totalStudents to a default or skip calculation
         }

        pendingCount += Math.max(0, totalStudents - submittedCount); // Count unsubmitted tasks

        if (isPast(dueDate) && submittedCount < totalStudents) {
           overdueCount += (totalStudents - submittedCount); // Count overdue SUBMISSIONS, not tasks
        }
      }
      if (isMounted) {
        setAssignments(fetchedAssignments);
        setPendingAssignments(pendingCount);
        setOverdueSubmissions(overdueCount);
        // Simulate recent activity for now
        setRecentActivity([
           "Student John submitted 'Algebra Basics'",
           "Quiz 'Cell Structure' was graded",
           "New Lesson Plan 'WWII Overview' created"
        ]);
      }
    });

    // --- Fetch Average Student Progress ---
    // Note: Ensure your student documents have a 'progress' field or similar
    const stuQuery = query(
      collection(db, 'Users'), // Ensure correct collection name 'Users'
      where('class', '==', userClass),
      where('role', '==', 'student')
    );
    const unsubStudents = onSnapshot(stuQuery, (stuSnap) => {
      if (!isMounted) return;
       let totalProgressSum = 0;
       let validStudentCount = 0;
        stuSnap.docs.forEach(doc => {
             const data = doc.data();
             // Assuming progress is stored like { overall: 75 } or just a number field 'progress'
             const progressVal = data.progress ?? 0; // Access direct progress field
             if (typeof progressVal === 'number' && !isNaN(progressVal)) {
                 totalProgressSum += progressVal;
                 validStudentCount++;
             }
        });
        if (isMounted) {
          setAvgProgress(validStudentCount > 0 ? totalProgressSum / validStudentCount : 0);
        }
    });

    // --- Fetch Upcoming Events ---
    const eventsQuery = query(
      collection(db, 'classes', userClass, 'events'),
      where('date', '>=', new Date()), // Events from today onwards
      orderBy('date', 'asc'), // Order by date
    //   limit(5) // Limit to a few upcoming events
    );

    const unsubEvents = onSnapshot(eventsQuery, (eventSnap) => {
      if (!isMounted) return;
       const fetchedEvents = eventSnap.docs.map(doc => {
          const data = doc.data();
          // Ensure date is converted correctly
          let eventDate: Date | null = null;
          if (data.date instanceof Timestamp) {
             eventDate = data.date.toDate();
          } else if (data.date instanceof Date) {
              eventDate = data.date;
          } else if (data.date?.seconds) {
              eventDate = new Timestamp(data.date.seconds, data.date.nanoseconds).toDate();
          }

          return {
             id: doc.id,
             title: data.title || 'Untitled Event',
             date: eventDate!, // Use the converted date (handle potential null if necessary)
             description: data.description || '',
          } as Event;
       }).filter(event => event.date); // Filter out events with invalid dates

       if (isMounted) {
         setUpcomingEvents(fetchedEvents);
       }
    });

    setLoading(false);

    // Cleanup listeners
    return () => {
      isMounted = false;
      unsubAssignments();
      unsubStudents();
      unsubEvents();
    };
  }, [user, userClass]); // Rerun if user or class changes


  const kpiData = [
     { label: 'Pending Tasks', value: pendingAssignments, icon: ListChecks },
     { label: 'Overdue Submissions', value: overdueSubmissions, icon: Hash },
     { label: 'Avg. Class Progress', value: `${avgProgress.toFixed(1)}%`, icon: CheckCircle },
     { label: 'Upcoming Events', value: upcomingEvents.length, icon: CalendarIcon },
   ];


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]"> {/* Adjusted height */}
        <span className="loader"></span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="container mx-auto py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8"> {/* Added mb-8 */}
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Teacher Home</h1>
              <p className="text-gray-500">Welcome back, {user?.displayName || user?.email}!</p>
          </div>
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"> {/* Added mb-8 */}
            {kpiData.map(({ label, value, icon: Icon }) => (
                <Card key={label} className="p-4 flex items-center gap-3 bg-white shadow-sm rounded-lg border border-gray-200">
                <div className="p-2 bg-indigo-100 rounded-full">
                     <Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="text-xl font-semibold text-gray-800">{value}</p>
                     {/* Mini Progress Bar for Avg Progress */}
                      {label === 'Avg. Class Progress' && typeof value === 'string' && (
                        <Progress value={parseFloat(value)} className="h-1 mt-1 w-full" />
                      )}
                </div>
                </Card>
            ))}
        </div>

        {/* Removed Quick Actions Toolbar */}
        {/* Removed Feature Cards Grid */}

         {/* Activity Feed & Upcoming Events Combined */}
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <Card className="lg:col-span-2 bg-white shadow-sm rounded-lg border border-gray-200">
                 <CardHeader>
                     <CardTitle className="text-xl flex items-center gap-2"><Activity className="w-5 h-5 text-orange-500"/> Recent Activity</CardTitle>
                     <CardDescription>Latest updates and submissions.</CardDescription>
                 </CardHeader>
                 <CardContent>
                     {recentActivity.length > 0 ? (
                         <ul className="space-y-3">
                             {recentActivity.slice(0, 5).map((activity, index) => ( // Show top 5
                                 <li key={index} className="flex items-center text-sm text-gray-600 border-b pb-2 last:border-0">
                                     <CheckCircle className="w-4 h-4 mr-2 text-green-500 flex-shrink-0"/>
                                     <span>{activity}</span>
                                     <span className="ml-auto text-xs text-gray-400">~ {index + 1}h ago</span>
                                 </li>
                             ))}
                         </ul>
                     ) : (
                         <p className="text-gray-500">No recent activity.</p>
                     )}
                 </CardContent>
             </Card>

             <Card className="bg-white shadow-sm rounded-lg border border-gray-200">
                  <CardHeader>
                      <CardTitle className="text-xl flex items-center gap-2"><CalendarIcon className="w-5 h-5 text-blue-500"/> Upcoming Events</CardTitle>
                      <CardDescription>What's next on the schedule.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      {upcomingEvents.length > 0 ? (
                          <ul className="space-y-3">
                              {upcomingEvents.slice(0, 5).map((event) => ( // Show top 5
                                  <li key={event.id} className="flex items-center text-sm text-gray-600 border-b pb-2 last:border-0">
                                       <div className="flex-1">
                                          <p className="font-medium">{event.title}</p>
                                          <p className="text-xs text-gray-400">{event.description?.substring(0,30)}...</p> {/* Truncate description */}
                                       </div>
                                      <span className="ml-auto text-xs text-gray-500 font-medium">{format(event.date, 'MMM dd')}</span>
                                  </li>
                              ))}
                          </ul>
                      ) : (
                          <p className="text-gray-500">No upcoming events.</p>
                      )}
                       {upcomingEvents.length > 0 && <Button variant="link" size="sm" className="px-0 mt-3" onClick={() => router.push('/teacher-dashboard/class-calendar')}>View Calendar &rarr;</Button>}
                  </CardContent>
              </Card>
         </div>
      </div>
    </div>
  );
}
