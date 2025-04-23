'use client';

import Link from 'next/link';
import { useEffect, useState } from "react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Icons} from '@/components/icons';
import {useAuth} from '@/components/auth-provider';
import {cn} from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useRouter } from 'next/navigation';
import {db} from '@/lib/firebase';
import {collection, query, where, onSnapshot} from "firebase/firestore";

export default function StudentDashboard() {
  const {user, userType, userClass} = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState([
        { name: 'Data Science', icon: 'DataScience' },
        { name: 'Programming', icon: 'Programming' },
        { name: 'Machine Learning', icon: 'MachineLearning' },
        { name: 'Mathematics', icon: 'Mathematics' },
    ]);
  const router = useRouter();
    const [tasks, setTasks] = useState<any[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);
    const [errorTasks, setErrorTasks] = useState<string | null>(null);


  const [recommendedCourses, setRecommendedCourses] = useState([
    { title: 'Introduction to Python', instructor: 'Rachel Andringari', lessons: 4, duration: '51 min', image: 'https://picsum.photos/300/200', youtubeLink: 'https://www.youtube.com/embed/N4mEzFDjQtA' },
    { title: 'Online Lessons with Katharina', instructor: 'Katharina', lessons: 6, duration: '8 lin', image: 'https://picsum.photos/301/200', youtubeLink: 'https://www.youtube.com/embed/VNlcrsRowlo' },
    { title: 'Introduction to Pract-1s Totaing', instructor: 'Joalna Radkart', lessons: 4, duration: '5 min', image: 'https://picsum.photos/302/200', youtubeLink: 'https://www.youtube.com/embed/jtsIJNbNHfg' },
    { title: 'Online Laxext', instructor: 'Lee Huang-Lian', lessons: 4, duration: '30 min', image: 'https://picsum.photos/303/200', youtubeLink: 'https://www.youtube.com/embed/H-dQ3zR1GDU' },
    ]);

    const handleSearch = () => {
        router.push(`/student-dashboard?search=${searchQuery}`);

    };

    const handleCategoryClick = (categoryName: string) => {
      router.push(`/student-dashboard/${categoryName.toLowerCase().replace(' ', '-')}`);
  };

    const handleBrowseCourses = () => {
        router.push(`/student-dashboard?browse=all`);
    };

    useEffect(() => {
        const fetchTasks = async () => {
            setLoadingTasks(true);
            setErrorTasks(null);
            try {
                if (!user || !userClass) {
                    setErrorTasks("User not logged in or class not defined.");
                    return;
                }

                const tasksCollection = collection(db, 'classes', userClass, 'events');
                const q = query(tasksCollection, where("type", "==", "task"));

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const tasksData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as any[];
                    setTasks(tasksData);
                });

                return () => unsubscribe();
            } catch (e: any) {
                setErrorTasks(e.message || "An error occurred while fetching tasks.");
            } finally {
                setLoadingTasks(false);
            }
        };

        fetchTasks();
    }, [user, userClass]);

  return (
    <div className="container mx-auto py-8">
      {/* Top Section */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6">
        {/* Left: Title and AI Image */}
        <div className="md:w-1/2">
          <h1 className="text-3xl font-bold mb-2">Learn with AI</h1>
          <p className="text-muted-foreground mb-4">Explore our courses and get help from the AI tutor.</p>
            <Button onClick={handleBrowseCourses}>Browse Courses</Button>
        </div>

        {/* Right: Image */}
        <div className="md:w-1/2 flex justify-center">
          <img src="https://picsum.photos/400/300" alt="AI Learning" className="rounded-lg shadow-md" />
        </div>
      </div>

      {/* Search and Categories */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-6">
        {/* Search Bar */}
        <div className="mb-4 md:mb-0 md:w-1/3">
          <Input
            type="search"
            placeholder="Search for courses"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
            <Button variant="secondary" size="sm" className="mt-2" onClick={handleSearch}>
                Search
            </Button>
        </div>

        {/* Course Categories */}
        <div className="flex space-x-4 items-center md:w-2/3">
          {categories.map((category) => (
            <Button variant="secondary" size="sm" key={category.name} onClick={() => handleCategoryClick(category.name)}>
              {category.name}
            </Button>
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
                                <img src={course.image} alt={course.title} className="w-full h-32 object-cover rounded-md mb-2" />
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
                                    <p className="text-sm text-muted-foreground">Due Date: {task.date}</p>
                                    {/* Add more details or actions here */}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <p>No tasks assigned yet.</p>
                )}
            </div>

      {/* Grid of Features (adjust as needed) */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Flashcard Generator */}
        <Card>
          <CardHeader>
            <CardTitle>Flashcard Generator</CardTitle>
            <CardDescription>Create flashcards based on a topic.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/student-dashboard/flashcards">
              <Button variant="secondary">
                Get Started <Icons.arrowRight className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* MCQ Generator */}
        <Card>
          <CardHeader>
            <CardTitle>MCQ Generator</CardTitle>
            <CardDescription>Generate Multiple Choice Questions on a topic.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/student-dashboard/mcq">
              <Button variant="secondary">
                Get Started <Icons.arrowRight className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Long Answer Question Generator */}
        <Card>
          <CardHeader>
            <CardTitle>Long Answer Question Generator</CardTitle>
            <CardDescription>Generate long answer questions and key points.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/student-dashboard/long-answer">
              <Button variant="secondary">
                Get Started <Icons.arrowRight className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Essay Feedback */}
        <Card>
          <CardHeader>
            <CardTitle>Essay Feedback</CardTitle>
            <CardDescription>Get detailed feedback on your essays.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/student-dashboard/essay-feedback">
              <Button variant="secondary">
                Get Started <Icons.arrowRight className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Progress Tracker */}
        <Card>
          <CardHeader>
            <CardTitle>Progress Tracker</CardTitle>
            <CardDescription>Visually track your progress through different topics.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/student-dashboard/progress">
              <Button variant="secondary">
                Get Started <Icons.arrowRight className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Personalized Learning Path */}
        <Card>
          <CardHeader>
            <CardTitle>Personalized Learning Path</CardTitle>
            <CardDescription>Get a personalized learning path based on your performance.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/student-dashboard/learning-path">
              <Button variant="secondary">
                Get Started <Icons.arrowRight className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
