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
      // Replace with actual AI-powered lesson plan generation
      const aiGeneratedPlan = await generateAiLessonPlan(goals);
      setLessonPlan(aiGeneratedPlan);
    } catch (e: any) {
      setError(e.message || "An error occurred while generating the lesson plan.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateAiLessonPlan = async (goals: string) => {
    // Simulate AI lesson plan generation (replace with actual AI call)
    return new Promise<string>((resolve) => {
      setTimeout(() => {
        resolve(`AI Generated Lesson Plan:\nBased on the goals: ${goals}\n\n- Step 1: ...\n- Step 2: ...\n- Step 3: ...`);
      }, 1000); // Simulate AI processing time
    });
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

