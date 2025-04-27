'use client';

import Link from 'next/link';
import {useEffect, useState} from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Icons} from '@/components/icons';
import {useAuth} from '@/components/auth-provider';
import {cn} from "@/lib/utils";
import {Input} from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {useRouter} from 'next/navigation';
import {
  collection,
  query,
  where,
  onSnapshot,
  DocumentData,
} from "firebase/firestore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {format} from 'date-fns';
import {Badge} from "@/components/ui/badge";

interface ClassEvent {
  id: string;
  title: string;
  description?: string;
  type: "task" | "event";
  date: Date;
}

const ClientComponent = () => {
  const {user, userType, userClass, signOut} = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([
    {name: 'Data Science', icon: 'DataScience', link: '/student-dashboard/data-science'},
    {name: 'Programming', icon: 'Programming', link: '/student-dashboard/programming'},
    {name: 'Machine Learning', icon: 'MachineLearning', link: '/student-dashboard/machine-learning'},
    {name: 'Mathematics', icon: 'Mathematics', link: '#'},
  ]);
  const router = useRouter();
  const [tasks, setTasks] = useState<ClassEvent[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [errorTasks, setErrorTasks] = useState<string | null>(null);

  const [recommendedCourses, setRecommendedCourses] = useState([
    {
      title: 'Introduction to Python',
      instructor: 'Rachel Andringari',
      lessons: 4,
      duration: '51 min',
      image: 'https://picsum.photos/300/200',
      youtubeLink: 'https://www.youtube.com/embed/N4mEzFDjQtA'
    },
    {
      title: 'Online Lessons with Katharina',
      instructor: 'Katharina',
      lessons: 6,
      duration: '8 lin',
      image: 'https://picsum.photos/301/200',
      youtubeLink: 'https://www.youtube.com/embed/VNlcrsRowlo'
    },
    {
      title: 'Introduction to Pract-1s Totaing',
      instructor: 'Joalna Radkart',
      lessons: 4,
      duration: '5 min',
      image: 'https://picsum.photos/302/200',
      youtubeLink: 'https://www.youtube.com/embed/jtsIJNbNHfg'
    },
    {
      title: 'Online Laxext',
      instructor: 'Lee Huang-Lian',
      lessons: 4,
      duration: '30 min',
      image: 'https://picsum.photos/303/200',
      youtubeLink: 'https://www.youtube.com/embed/H-dQ3zR1GDU'
    },
  ]);

  const handleSearch = () => {
    router.push(`/student-dashboard?search=${searchQuery}`);

  };

  const handleCategoryClick = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    if (category && category.link) {
      router.push(category.link);
    } else {
      // Handle the case where the link is not defined, perhaps show an error message
      console.error(`Link not defined for category: ${categoryName}`);
    }
  };


  useEffect(() => {
    if (!user) {
      setLoading(false);
      router.push("/login");
      return;
    }

    setLoadingTasks(true);
    setErrorTasks(null);

    if (user && userClass) {
      const tasksCollection = collection(db, 'classes', userClass, 'events');
      const q = query(tasksCollection, where("type", "==", "task"));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const tasksData = snapshot.docs.map(doc => {
          const raw = doc.data() as DocumentData;
          return {
            id: doc.id,
            title: raw.title,
            description: raw.description,
            type: raw.type,
            date: raw.date.toDate(),
          } as ClassEvent;
        });
        setTasks(tasksData);
        setLoadingTasks(false);
      }, (error) => {
        setErrorTasks(error.message || "An error occurred while fetching tasks.");
        setLoadingTasks(false);
      });

      return () => unsubscribe();
    } else {
      setErrorTasks("User not logged in or class not defined.");
      setLoadingTasks(false);
    }
  }, [user, userClass, router]);


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Student Dashboard</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open user menu</span>
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://github.com/shadcn.png" alt="Shadcn"/>
                <AvatarFallback>SC</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <Button variant="secondary" onClick={signOut} className="w-full h-full block">
                Log Out
              </Button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Assigned Tasks */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Assigned Tasks</h2>
        {loadingTasks ? (
          <p>Loading tasks...</p>
        ) : errorTasks ? (
          <p className="text-red-500">{errorTasks}</p>
        ) : tasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <Card key={task.id}>
                <CardHeader>
                  <CardTitle>{task.title}</CardTitle>
                  <CardDescription>{task.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Due Date: {format(task.date, "dd/MM/yyyy")}</p>
                  {/* Add more details or actions here */}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p>No tasks assigned yet.</p>
        )}
      </div>

      {/* Course Categories */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Explore Subjects</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Card key={category.name}
                  className="cursor-pointer hover:shadow-md transition-shadow duration-300">
              <CardContent className="flex flex-col items-start">
                {category.icon && <Icons[category.icon] className="h-6 w-6 mb-2 text-primary"/>}
                <h3 className="font-semibold">{category.name}</h3>
                <Button variant="secondary" size="sm" onClick={() => handleCategoryClick(category.name)}>
                  Explore
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recommended Courses */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-4">Recommended for You</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {recommendedCourses.map((course, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{course.title}</CardTitle>
                <img src={course.image} alt={course.title} className="w-full h-32 object-cover rounded-md mb-2"/>
                <CardDescription>By {course.instructor}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {course.lessons} lessons, {course.duration}
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="secondary">Watch Video</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <iframe
                      width="100%"
                      height="315"
                      src={course.youtubeLink}
                      title="YouTube video player"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return <ClientComponent/>;
}

