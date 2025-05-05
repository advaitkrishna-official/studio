
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Code, Zap } from 'lucide-react';

export default function ProgrammingPage() {
  return (
    // Container and layout are handled by src/app/student-dashboard/layout.tsx
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Programming Hub</h1>
        <Button variant="outline">
          <Zap className="mr-2 h-4 w-4" />
          Practice Coding Challenge
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Learning Resources Card */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Code className="mr-2 h-5 w-5 text-indigo-500" />
              Learning Resources
            </CardTitle>
            <CardDescription>Explore tutorials and documentation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Placeholder Links - Replace with actual content */}
            <div className="flex items-center justify-between text-sm">
              <span>Introduction to Python</span>
              <Button variant="link" size="sm" className="px-0">Read Now &rarr;</Button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>JavaScript Fundamentals</span>
              <Button variant="link" size="sm" className="px-0">Watch Video &rarr;</Button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Data Structures Guide</span>
              <Button variant="link" size="sm" className="px-0">Explore &rarr;</Button>
            </div>
          </CardContent>
        </Card>

        {/* Practice Problems Card */}
        <Card className="shadow-sm border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="mr-2 h-5 w-5 text-green-500" />
              Practice Problems
            </CardTitle>
            <CardDescription>Sharpen your skills with coding exercises.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
             {/* Placeholder Problems - Replace with actual content */}
            <div className="flex items-center justify-between text-sm">
              <span>Easy: Two Sum</span>
              <Button variant="link" size="sm" className="px-0">Solve &rarr;</Button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Medium: Reverse Linked List</span>
               <Button variant="link" size="sm" className="px-0">Solve &rarr;</Button>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Hard: Find Median from Data Stream</span>
               <Button variant="link" size="sm" className="px-0">Solve &rarr;</Button>
            </div>
          </CardContent>
        </Card>

        {/* Add more cards or sections as needed, e.g., Projects, Tools, Community */}
      </div>

      <div className="mt-8 bg-muted p-4 rounded-md shadow-inner">
        <p className="text-muted-foreground text-center">
          Welcome to the Programming section! Enhance your coding skills here.
        </p>
      </div>
    </>
  );
}
