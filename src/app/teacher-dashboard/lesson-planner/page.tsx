'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateLongAnswerQuestions } from "@/ai/flows/generate-long-answer-questions";
import { generateLongAnswerQuestions as generateLongAnswerQuestionsFlow } from "@/ai/flows/generate-long-answer-questions";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";


// Define the structure for a task in the Gantt chart
interface GanttTask {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  progress: number;
  dependencies?: string[];
}

// Define the expected output from the AI model
interface AiLessonPlannerFlowOutput {
  tasks: GanttTask[];
}

const LessonPlannerPage = () => {
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [learningObjectives, setLearningObjectives] = useState("");
  const [topics, setTopics] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [lessonPlan, setLessonPlan] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleGenerateLessonPlan = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Call the AI model here to generate lesson plan based on input parameters
      const prompt = `
        Subject: ${subject}
        Grade Level: ${gradeLevel}
        Learning Objectives: ${learningObjectives}
        Topics to be covered: ${topics}
        Start Date: ${startDate}
        End Date: ${endDate}
        
        Generate a lesson plan with daily or weekly breakdowns, suggested teaching methods,
        resource recommendations, and checkpoints.
      `;

      // Replace with actual AI-powered lesson plan generation
      const aiGeneratedPlan = await generateLongAnswerQuestions({ topic: prompt, numQuestions: 5 });

      setLessonPlan(aiGeneratedPlan?.questions?.join('\n') || "Failed to generate lesson plan.");
    } catch (e: any) {
      setError(e.message || "An error occurred while generating the lesson plan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLessonPlan = async () => {
    if (!user) {
      setError("User not logged in.");
      return;
    }

    try {
      const lessonPlansCollection = collection(db, `teachers/${user.uid}/lessonPlans`);
      await addDoc(lessonPlansCollection, {
        subject,
        gradeLevel,
        learningObjectives,
        topics,
        startDate,
        endDate,
        lessonPlan,
        dateCreated: new Date(),
        status: "Draft",
      });
      toast({
        title: "Lesson Plan Saved",
        description: "Your lesson plan has been saved successfully.",
      });
    } catch (e: any) {
      setError(e.message || "An error occurred while saving the lesson plan.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save lesson plan.",
      });
    }
  };


  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>AI-Powered Lesson Planner</CardTitle>
          <CardDescription>
            Enter your lesson goals and dates to generate a lesson plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Enter subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="gradeLevel">Grade Level</Label>
            <Input
              id="gradeLevel"
              placeholder="Enter grade level..."
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="learningObjectives">Learning Objectives</Label>
            <Textarea
              id="learningObjectives"
              placeholder="Enter learning objectives..."
              value={learningObjectives}
              onChange={(e) => setLearningObjectives(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="topics">Topics to be Covered</Label>
            <Textarea
              id="topics"
              placeholder="Enter topics to be covered..."
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button onClick={handleGenerateLessonPlan} disabled={isLoading}>
            {isLoading ? "Generating Lesson Plan..." : "Generate Lesson Plan"}
          </Button>
          {error && <p className="text-red-500">{error}</p>}
          {lessonPlan && (
            <div className="grid gap-2">
              <Label htmlFor="lessonPlan">Lesson Plan</Label>
              <div>
                {/* Text-based representation of the lesson plan */}
                <Textarea
                  id="lessonPlan"
                  readOnly
                  value={lessonPlan}
                  className="resize-none"
                />
                {/* Placeholder for Gantt chart */}
                {/* <p>Lesson Plan Graph (Placeholder)</p>
                <p>Due to the complexity of generating interactive charts, a basic graph cannot be displayed. Further assistance may be needed</p> */}
                <Button onClick={handleSaveLessonPlan}>Save Lesson Plan</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LessonPlannerPage;
