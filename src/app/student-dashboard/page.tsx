'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { auth, db } from '@/lib/firebase';
import { collection, query, onSnapshot, where, DocumentData } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { format } from 'date-fns';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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
} from 'lucide-react';

import MyAssignments from './my-assignments/page';

interface Assignment {
  id: string;
  title: string;
  description: string;
  type: string;
  dueDate: Date;
}

function Sidebar() {
  const router = useRouter();
  const links = [
    { name: 'Home', Icon: Home, link: '/student-dashboard' },
    { name: 'Assignments', Icon: ListChecks, link: '/student-dashboard/my-assignments' },
    { name: 'Flashcards', Icon: BookOpenCheck, link: '/student-dashboard/flashcards' },
    { name: 'MCQs', Icon: LayoutGrid, link: '/student-dashboard/mcqs' },
    { name: 'Essay Feedback', Icon: PencilRuler, link: '/student-dashboard/essay-feedback' },
    { name: 'Progress', Icon: LineChart, link: '/student-dashboard/progress' },
    { name: 'Learning Path', Icon: BookOpen, link: '/student-dashboard/learning-path' },
  ];

  return (
    <aside className="bg-white border-r border-gray-200 w-64 hidden md:block">
      <nav className="p-4 space-y-4">
        <Link href="/student-dashboard" className="flex items-center gap-2 text-xl font-bold">
          <Code className="w-6 h-6" /> Learn Hub
        </Link>
        {links.map(({ name, Icon, link }) => (
          <Link
            key={name}
            href={link}
            className="flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-100"
          >
            <Icon className="w-5 h-5" /> {name}
          </Link>
        ))}
        <Separator />
        <Button
          variant="ghost"
          onClick={() => signOut(auth!)}
          className="w-full justify-start"
        >
          <LogOut className="w-4 h-4 mr-2" /> Log Out
        </Button>
      </nav>
    </aside>
  );
}

export default function StudentDashboardPage() {
  const { user, userClass } = useAuth();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!userClass) {
      setLoadingTasks(false);
      return;
    }

    const col = collection(db, 'assignments');
    const q = query(col, where('assignedTo.classId', '==', userClass));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => {
        const raw = d.data() as DocumentData;
        return {
          id: d.id,
          title: raw.title,
          description: raw.description,
          type: raw.type,
          dueDate: raw.dueDate.toDate(),
        } as Assignment;
      });
      setAssignments(data);
      setLoadingTasks(false);
    });

    return () => unsub();
  }, [user, userClass, router]);

  const handleSearch = () => {
    router.push(`/student-dashboard?search=${encodeURIComponent(searchQuery)}`);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Mobile sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className="md:hidden fixed top-4 left-4 z-50">
            <Menu className="w-5 h-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        <header className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Student Dashboard</h1>
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" /> Search
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || ''} alt={user.displayName || 'User'} />
                    <AvatarFallback>
                      {user.displayName
                        ?.split(' ')
                        .map((n) => n.charAt(0))
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => signOut(auth!)}>
                  <LogOut className="mr-2 h-4 w-4" /> Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 space-y-12">
          {/* Assignments Grid */}
          {loadingTasks ? (
            <p>Loading your assignments…</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignments.map((a) => (
                <Card key={a.id}>
                  <CardHeader>
                    <CardTitle>{a.title}</CardTitle>
                    <CardDescription>{a.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Due: {format(a.dueDate, 'dd/MM/yyyy')}
                    </span>
                    <Badge variant="outline">{a.type}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Detailed “My Assignments” page */}
          <MyAssignments />
        </main>
      </div>
    </div>
  );
}