'use client';

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { useAuth } from "@/components/auth-provider";
import { getAuth, onAuthStateChanged } from "firebase/auth";


export default function Home() {
  const router = useRouter();
    const { user, loading, userType } = useAuth();


    useEffect(() => {
      if (!loading) {
        if (!user) {
          router.push('/login');
          return;
        }

        if (userType === 'teacher') {
          router.push(`/teacher-dashboard?class=${user?.class}`);
        }
      }
    }, [user, loading, userType, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-6 py-10 md:py-16">
        <div className="container mx-auto">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Welcome to EduAI - Your AI Tutor
          </h1>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg opacity-90 mt-4">
            Supercharge your learning experience with AI-powered tools. Generate flashcards, practice with MCQs, get essay feedback and more!
          </p>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="container mx-auto grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Flashcard Generator</CardTitle>
              <CardDescription>Generate flashcards based on a topic.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/flashcards">
                <Button variant="secondary">
                  Get Started <Icons.arrowRight className="ml-2" />
                </Button>
              </Link>
              {/* Previous scores here */}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>MCQ Generator</CardTitle>
              <CardDescription>Generate Multiple Choice Questions on a topic.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/mcq">
                <Button variant="secondary">
                  Get Started <Icons.arrowRight className="ml-2" />
                </Button>
              </Link>
               {/* Previous scores here */}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Long Answer Question Generator</CardTitle>
              <CardDescription>Generate long answer questions and key points.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/long-answer">
                <Button variant="secondary">
                  Get Started <Icons.arrowRight className="ml-2" />
                </Button>
              </Link>
               {/* Previous scores here */}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Essay Feedback</CardTitle>
              <CardDescription>Get detailed feedback on your essays.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/essay-feedback">
                <Button variant="secondary">
                  Get Started <Icons.arrowRight className="ml-2" />
                </Button>
              </Link>
               {/* Previous feedback here */}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress Tracker</CardTitle>
              <CardDescription>Visually track your progress through different topics.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/progress">
                <Button variant="secondary">
                  Get Started <Icons.arrowRight className="ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personalized Learning Path</CardTitle>
              <CardDescription>Get a personalized learning path based on your performance.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/learning-path">
                <Button variant="secondary">
                  Get Started <Icons.arrowRight className="ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="px-6 py-4 text-center text-muted-foreground">
        <div className="container mx-auto">
          <p>
            &copy; {new Date().getFullYear()} EduAI - All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
