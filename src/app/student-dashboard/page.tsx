'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { useAuth } from '@/components/auth-provider';

export default function StudentDashboard() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">
        Welcome to Your Student Dashboard, {user?.displayName || "Student"}!
      </h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Flashcard Generator</CardTitle>
            <CardDescription>Generate flashcards based on a topic.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/student-dashboard/flashcards">
              <Button variant="secondary">
                Get Started <Icons.arrowRight className="ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

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
