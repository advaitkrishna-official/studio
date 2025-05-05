'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { auth, db } from '@/lib/firebase';
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
import { signOut } from 'firebase/auth';
import { format, isPast } from 'date-fns';
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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
  CheckCircle,
  Calendar as CalendarIcon,
  ChevronRight,
  Settings,
  HelpCircle,
  User as UserIcon,
  Activity,
  BookCopy,
  BookText,
  GraduationCap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Interfaces (assuming these are defined correctly)
interface Assignment {
  id: string;
  title: string;
  dueDate: Date; // AssumingdueDate is always a Date object after fetching
  type: string;
  assignedTo: { classId: string; studentIds: string[] };
}

interface GradeData {
  id: string;
  taskName: string;
  score: number;
  feedback: string;
  timestamp: Timestamp | Date;
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
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();
};


export default function TeacherDashboardPage() {
  const { user, userType, userClass, signOut: contextSignOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [pendingAssignments, setPendingAssignments] = useState(0);
  const [overdueSubmissions, setOverdueSubmissions] = useState(0);
  const [avgProgress, setAvgProgress] = useState(0);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [recentActivity, setRecentActivity] = useState<string[]>([]); // Example: ["Student X submitted Assignment Y", "You created Quiz Z"]
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [newAsgOpen, setNewAsgOpen] = useState(false);
  const [newQuizOpen, setNewQuizOpen] = useState(false);
  const [newLessonOpen, setNewLessonOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (userType === 'student') {
      router.push('/student-dashboard'); // Redirect students
      return;
    }
    if (!userClass) {
       console.warn("Teacher class not found, dashboard might not load data.");
       setLoading(false); // Stop loading if no class context
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
        const totalStudents = studentIds.length || (await getDocs(query(collection(db, 'users'), where('class', '==', userClass), where('role', '==', 'student')))).size; // Fetch class size if needed

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
             const progressVal = data.progress?.overall ?? data.progress ?? 0;
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
          return {
             id: doc.id,
             title: data.title,
             date: data.date.toDate(), // Convert Timestamp to Date
             description: data.description,
          } as Event;
       });
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
  }, [user, userType, userClass, router]); // Rerun if user or class changes


  const handleLogout = async () => {
    await contextSignOut(); // Use signOut from context
    // router.push('/login'); // Redirect handled by AuthProvider now
  };

  const dashboardItems = [
    { title: 'Lesson Planner', href: '/teacher-dashboard/lesson-planner', icon: BookOpenCheck, description: "Create and manage lesson plans." },
    { title: 'Quiz Builder', href: '/teacher-dashboard/quiz-builder', icon: LayoutGrid, description: "Create and manage quizzes." },
    { title: 'Student Manager', href: '/teacher-dashboard/student-manager', icon: UserIcon, description: "Manage student profiles & progress." },
    { title: 'Assignment Hub', href: '/teacher-dashboard/teachers-assignment-hub', icon: ListChecks, description: "Create & track assignments." },
    { title: 'Class Calendar', href: '/teacher-dashboard/class-calendar', icon: CalendarIcon, description: "View & manage schedule." },
    { title: 'Overview', href: '/teacher-dashboard/overview', icon: LineChart, description: "Class performance overview." },
  ];

  const kpiData = [
     { label: 'Pending Tasks', value: pendingAssignments, icon: ListChecks },
     { label: 'Overdue Submissions', value: overdueSubmissions, icon: Hash },
     { label: 'Avg. Class Progress', value: `${avgProgress.toFixed(1)}%`, icon: CheckCircle },
     { label: 'Upcoming Events', value: upcomingEvents.length, icon: CalendarIcon },
   ];


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <span className="loader"></span>
      </div>
    );
  }

  if (!user || userType !== 'teacher') {
     // Redirect handled in useEffect, show minimal loading/message here
     return <div className="flex items-center justify-center min-h-screen"><p>Loading or redirecting...</p></div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r p-4 space-y-6 hidden md:flex flex-col">
        <Link href="/teacher-dashboard" className="flex items-center gap-2 text-xl font-bold text-indigo-600">
          <GraduationCap className="w-7 h-7" /> EduAI Teacher
        </Link>
        <nav className="flex-1 space-y-2">
            <Link href="/teacher-dashboard" className="flex items-center gap-3 p-2 rounded-md text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 font-medium">
                <Home className="w-5 h-5" /> Teacher Home
            </Link>
            {dashboardItems.map(item => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 p-2 rounded-md text-gray-600 hover:bg-indigo-50 hover:text-indigo-600">
                <item.icon className="w-5 h-5" /> {item.title}
            </Link>
            ))}
        </nav>
        <Separator />
        <div className="space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-3 text-gray-600 hover:bg-gray-100 hover:text-gray-900">
                <Settings className="w-5 h-5" /> Settings
            </Button>
             <Button variant="ghost" className="w-full justify-start gap-3 text-gray-600 hover:bg-gray-100 hover:text-gray-900">
                 <HelpCircle className="w-5 h-5" /> Help
             </Button>
            <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-3 text-red-600 hover:bg-red-50 hover:text-red-700">
                <LogOut className="w-5 h-5" /> Log Out
            </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 lg:p-10 space-y-8 overflow-y-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
             <h1 className="text-3xl font-bold text-gray-800">Teacher Home</h1>
              <p className="text-gray-500">Welcome back, {user.displayName || user.email}!</p>
          </div>

          {/* Mobile Menu Trigger */}
          <Sheet>
             <SheetTrigger asChild className="md:hidden">
                <Button variant="outline" size="icon"><Menu className="h-5 w-5" /></Button>
             </SheetTrigger>
             <SheetContent side="left" className="w-64 p-0">
                 {/* Replicate Sidebar Content Here */}
                 <div className="p-4 space-y-6 flex flex-col h-full">
                    <Link href="/teacher-dashboard" className="flex items-center gap-2 text-xl font-bold text-indigo-600">
                      <GraduationCap className="w-7 h-7" /> EduAI Teacher
                    </Link>
                    <nav className="flex-1 space-y-2">
                        <Link href="/teacher-dashboard" className="flex items-center gap-3 p-2 rounded-md text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 font-medium">
                            <Home className="w-5 h-5" /> Teacher Home
                        </Link>
                        {dashboardItems.map(item => (
                        <Link key={item.href} href={item.href} className="flex items-center gap-3 p-2 rounded-md text-gray-600 hover:bg-indigo-50 hover:text-indigo-600">
                            <item.icon className="w-5 h-5" /> {item.title}
                        </Link>
                        ))}
                    </nav>
                    <Separator />
                    <div className="space-y-2">
                        <Button variant="ghost" className="w-full justify-start gap-3 text-gray-600 hover:bg-gray-100 hover:text-gray-900">
                            <Settings className="w-5 h-5" /> Settings
                        </Button>
                         <Button variant="ghost" className="w-full justify-start gap-3 text-gray-600 hover:bg-gray-100 hover:text-gray-900">
                             <HelpCircle className="w-5 h-5" /> Help
                         </Button>
                        <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-3 text-red-600 hover:bg-red-50 hover:text-red-700">
                            <LogOut className="w-5 h-5" /> Log Out
                        </Button>
                    </div>
                 </div>
             </SheetContent>
           </Sheet>
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button variant="default" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push('/teacher-dashboard/teachers-assignment-hub')}>
              <ListChecks className="mr-2 h-4 w-4" /> New Assignment
          </Button>
           <Button variant="default" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push('/teacher-dashboard/quiz-builder')}>
               <LayoutGrid className="mr-2 h-4 w-4" /> New Quiz
           </Button>
          <Button variant="default" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => router.push('/teacher-dashboard/lesson-planner')}>
              <BookOpenCheck className="mr-2 h-4 w-4" /> New Lesson Plan
          </Button>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardItems.map(item => (
            <Link key={item.href} href={item.href} className="block group">
              <Card className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:scale-[1.02] hover:border-indigo-300 transition-all duration-200 h-full flex flex-col justify-between">
                  <div>
                      <div className="p-2 bg-indigo-100 rounded-lg inline-block mb-3">
                         <item.icon className="w-6 h-6 text-indigo-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800">{item.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                 </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 mt-4 self-end group-hover:text-indigo-500" />
              </Card>
            </Link>
          ))}
        </div>

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

      </main>
    </div>
  );
}