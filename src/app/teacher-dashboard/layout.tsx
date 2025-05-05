'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { auth, db } from '@/lib/firebase'; // Assuming db is needed, adjust if not
import { signOut as firebaseSignOut } from 'firebase/auth'; // Renamed to avoid conflict
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
  Menu,
  Home,
  ListChecks,
  BookOpenCheck,
  LayoutGrid,
  PencilRuler,
  BookOpen,
  LineChart,
  LogOut,
  Settings,
  HelpCircle,
  User as UserIcon,
  Activity,
  BookCopy,
  BookText,
  GraduationCap,
  Calendar as CalendarIcon, // Renamed CalendarIcon
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';


// Function to get initials for AvatarFallback
const getInitials = (name: string) => {
  return name
    ?.split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase() || '';
};

export default function TeacherDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userType, userClass, signOut: contextSignOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);


  // Redirect non-teachers or unauthenticated users
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (userType && userType !== 'teacher') {
      router.push('/login'); // Redirect students/others to login if they land here
    }
     setLoading(false); // Assume loading is done once checks pass
  }, [user, userType, router]);

  const handleLogout = async () => {
    try {
      await contextSignOut();
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
      toast({ variant: 'destructive', title: 'Logout Failed' });
    }
  };

  const navLinks = [
    { title: 'Teacher Home', href: '/teacher-dashboard', icon: Home },
    { title: 'Lesson Planner', href: '/teacher-dashboard/lesson-planner', icon: BookOpenCheck },
    { title: 'Quiz Builder', href: '/teacher-dashboard/quiz-builder', icon: LayoutGrid },
    { title: 'Student Manager', href: '/teacher-dashboard/student-manager', icon: UserIcon },
    { title: 'Assignment Hub', href: '/teacher-dashboard/teachers-assignment-hub', icon: ListChecks },
    { title: 'Class Calendar', href: '/teacher-dashboard/class-calendar', icon: CalendarIcon },
    { title: 'Overview', href: '/teacher-dashboard/overview', icon: LineChart },
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
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Header with Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b bg-white shadow-sm">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          {/* Left Side: Logo */}
          <Link href="/teacher-dashboard" className="flex items-center gap-2 text-xl font-bold text-indigo-600">
            <GraduationCap className="w-7 h-7" /> EduAI Teacher
          </Link>

          {/* Center: Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map(item => (
                <Button key={item.href} variant="ghost" size="sm" asChild className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50">
                    <Link href={item.href}>
                        <item.icon className="mr-1.5 h-4 w-4" /> {item.title}
                    </Link>
                </Button>
            ))}
          </nav>

          {/* Right Side: User Menu & Mobile Menu Trigger */}
           <div className="flex items-center gap-3">
              {/* User Dropdown */}
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                          <Avatar className="h-9 w-9 border-2 border-indigo-100">
                             <AvatarImage src={user?.photoURL || undefined} alt="User Avatar" data-ai-hint="teacher avatar" />
                              <AvatarFallback className="bg-indigo-100 text-indigo-600 font-semibold">
                                  {getInitials(user.displayName || user.email || 'T')}
                              </AvatarFallback>
                          </Avatar>
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">{user.displayName || user.email}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                              Teacher
                            </p>
                          </div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push('/teacher-dashboard/settings')}>
                          <Settings className="mr-2 h-4 w-4" /> Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push('/teacher-dashboard/help')}>
                          <HelpCircle className="mr-2 h-4 w-4" /> Help
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:bg-red-50 focus:text-red-700">
                          <LogOut className="mr-2 h-4 w-4" /> Log out
                      </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile Menu Trigger */}
              <Sheet>
                 <SheetTrigger asChild className="md:hidden">
                    <Button variant="outline" size="icon"><Menu className="h-5 w-5" /></Button>
                 </SheetTrigger>
                 <SheetContent side="left" className="w-64 p-4">
                      <SheetHeader className="mb-4">
                        <SheetTitle className="text-left">Navigation</SheetTitle>
                      </SheetHeader>
                     <nav className="flex flex-col space-y-2">
                          {navLinks.map(item => (
                             <Button key={item.href} variant="ghost" asChild className="justify-start gap-3 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50">
                                  <Link href={item.href}>
                                      <item.icon className="w-5 h-5" /> {item.title}
                                  </Link>
                              </Button>
                          ))}
                     </nav>
                     <Separator className="my-4"/>
                     <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-3 text-red-600 hover:bg-red-50 hover:text-red-700">
                         <LogOut className="w-5 h-5" /> Log Out
                     </Button>
                 </SheetContent>
               </Sheet>
            </div>
        </div>
      </header>

      {/* Main content area where child pages will be rendered */}
      <main className="flex-1 container mx-auto p-6 lg:p-10 space-y-8">
        {children}
      </main>
    </div>
  );
}
