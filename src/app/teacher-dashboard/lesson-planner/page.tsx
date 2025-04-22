'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateLongAnswerQuestions } from "@/ai/flows/generate-long-answer-questions";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";

// Define the structure for a lesson plan item
interface LessonPlanItem {
  week: number;
  topic: string;
  activities: string;
  resources: string[];
  assessment: string;
}

const LessonPlannerPage = () => {
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [learningObjectives, setLearningObjectives] = useState("");
  const [topics, setTopics] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [lessonPlanItems, setLessonPlanItems] = useState<LessonPlanItem[]>([]);
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
        
        Generate a structured lesson plan with daily or weekly breakdowns, suggested teaching methods,
        resource recommendations (including PDFs, videos, flashcards, AI-generated MCQs),
        and checkpoints. The plan should be in JSON format with the following structure:

        {
          "lessonTitle": "Title",
          "learningObjectives": ["Objective 1", "Objective 2"],
          "lessonPlan": [
            {
              "week": 1,
              "topic": "Topic 1",
              "activities": "Description of Activities",
              "resources": ["PDF Link", "Video Link"],
              "assessment": "Mini-quiz"
            },
            {
              "week": 2,
              "topic": "Topic 2",
              "activities": "Description of Activities",
              "resources": ["Flashcard Set", "MCQ Set"],
              "assessment": "Review session"
            }
          ]
        }
      `;

      // Replace with actual AI-powered lesson plan generation
      const aiGeneratedPlan = await generateLongAnswerQuestions({ topic: prompt, numQuestions: 5 });

      if (aiGeneratedPlan?.questions) {
        try {
          // Attempt to parse the AI-generated plan as JSON
          const lessonPlan = JSON.parse(aiGeneratedPlan.questions.join('\n'));

          // Check that the parsed data has the expected structure
          if (lessonPlan && lessonPlan.lessonPlan && Array.isArray(lessonPlan.lessonPlan)) {
            // Map the AI-generated data to the LessonPlanItem interface
            const lessonItems: LessonPlanItem[] = lessonPlan.lessonPlan.map((item: any) => ({
              week: item.week || 0,
              topic: item.topic || "",
              activities: item.activities || "",
              resources: item.resources || [],
              assessment: item.assessment || ""
            }));
            setLessonPlanItems(lessonItems);
          } else {
            setError("Failed to parse AI generated lesson plan.");
            setLessonPlanItems([]);
          }
        } catch (parseError: any) {
          setError(`Failed to parse JSON: ${parseError.message}`);
          setLessonPlanItems([]);
        }
      } else {
        setError("Failed to generate lesson plan.");
        setLessonPlanItems([]);
      }
    } catch (e: any) {
      setError(e.message || "An error occurred while generating the lesson plan.");
      setLessonPlanItems([]);
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
        lessonPlan: lessonPlanItems,
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
          {lessonPlanItems.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="lessonPlan">Lesson Plan</Label>
              <div>
                {lessonPlanItems.map((item, index) => (
                  <div key={index} className="mb-4 border p-4 rounded">
                    <h3 className="text-xl font-bold">Week {item.week}</h3>
                    <p><strong>Topic:</strong> {item.topic}</p>
                    <p><strong>Activities:</strong> {item.activities}</p>
                    <p><strong>Resources:</strong> {item.resources.join(', ')}</p>
                    <p><strong>Assessment:</strong> {item.assessment}</p>
                  </div>
                ))}
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
