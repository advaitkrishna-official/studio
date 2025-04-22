'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const LessonPlannerPage = () => {
  const [goals, setGoals] = useState("");
  const [lessonPlan, setLessonPlan] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateLessonPlan = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Implement AI-powered lesson plan generation here
      // For now, just simulate a response
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setLessonPlan("This is a sample AI generated lesson plan.");
    } catch (e: any) {
      setError(e.message || "An error occurred while generating the lesson plan.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>AI-Powered Lesson Planner</CardTitle>
          <CardDescription>
            Enter your goals to generate a lesson plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="goals">Goals</Label>
            <Textarea
              id="goals"
              placeholder="Enter your lesson goals..."
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
            />
          </div>
          <Button onClick={handleGenerateLessonPlan} disabled={isLoading}>
            {isLoading ? "Generating Lesson Plan..." : "Generate Lesson Plan"}
          </Button>
          {error && <p className="text-red-500">{error}</p>}
          {lessonPlan && (
            <div className="grid gap-2">
              <Label htmlFor="lessonPlan">Lesson Plan</Label>
              <Textarea
                id="lessonPlan"
                readOnly
                value={lessonPlan}
                className="resize-none"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LessonPlannerPage;
