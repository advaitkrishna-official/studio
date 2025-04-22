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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LessonPlanItem {
  week: number;
  topic: string;
  activities: string;
  resources: string[];
  assessment: string;
  teachingMethods: string;
  intendedOutcomes: string;
  notes?: string;
}

const LessonPlannerPage = () => {
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [learningObjectives, setLearningObjectives] = useState("");
  const [topics, setTopics] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [teachingMethods, setTeachingMethods] = useState("");
  const [intendedOutcomes, setIntendedOutcomes] = useState("");
  const [lessonPlanItems, setLessonPlanItems] = useState<LessonPlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, userClass } = useAuth();
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState(userClass || ""); // Initialize with userClass
  const [classes, setClasses] = useState<string[]>(["Grade 8", "Grade 6", "Grade 4"]); // Static class options

  const handleGenerateLessonPlan = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const prompt = `
        Subject: ${subject}
        Grade Level: ${gradeLevel}
        Learning Objectives: ${learningObjectives}
        Topics to be covered: ${topics}
        Timeframe: From ${startDate} to ${endDate}
        Class: ${selectedClass}

        Generate a detailed and editable lesson plan in JSON format with the following structure:

        {
          "lessonTitle": "Title",
          "learningObjectives": ["Objective 1", "Objective 2"],
          "teachingMethods": "Suggested methods (e.g., group work, visual aids)",
          "intendedOutcomes": "Expected student outcomes",
          "lessonPlan": [
            {
              "week": 1,
              "topic": "Topic Name",
              "activities": "Activities description",
              "resources": ["PDF link", "Flashcards"],
              "assessment": "Mini-quiz or review",
              "teachingMethods": "Visual aids, MCQs",
              "intendedOutcomes": "Students should understand X",
              "notes": "Optional teacher notes"
            }
          ]
        }
      `;

      const aiGeneratedPlan = await generateLongAnswerQuestions({ topic: prompt, numQuestions: 1 });

      if (aiGeneratedPlan?.questions) {
        try {
          const lessonPlan = JSON.parse(aiGeneratedPlan.questions[0]);

          if (lessonPlan && lessonPlan.lessonPlan && Array.isArray(lessonPlan.lessonPlan)) {
            const lessonItems: LessonPlanItem[] = lessonPlan.lessonPlan.map((item: any) => ({
              week: item.week || 0,
              topic: item.topic || "",
              activities: item.activities || "",
              resources: item.resources || [],
              assessment: item.assessment || "",
              teachingMethods: item.teachingMethods || "",
              intendedOutcomes: item.intendedOutcomes || "",
              notes: item.notes || ""
            }));

            setLessonTitle(lessonPlan.lessonTitle || "");
            setTeachingMethods(lessonPlan.teachingMethods || "");
            setIntendedOutcomes(lessonPlan.intendedOutcomes || "");
            setLessonPlanItems(lessonItems);
          } else {
            setError("Failed to parse AI generated lesson plan: Incorrect format.");
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
        lessonTitle,
        teachingMethods,
        intendedOutcomes,
        lessonPlan: lessonPlanItems,
        dateCreated: new Date(),
        status: "Draft",
        classId: selectedClass,
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

  // Prepare data for the chart
  const chartData = lessonPlanItems.map(item => ({
    name: `Week ${item.week}`,
    Activities: item.activities.length, // Example: Number of activities
  }));

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

          {/* Class Selection Dropdown */}
          <div className="grid gap-2">
            <label htmlFor="class">Select Class</label>
            <Select onValueChange={setSelectedClass} defaultValue={userClass}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" placeholder="Enter subject..." value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="gradeLevel">Grade Level</Label>
            <Input id="gradeLevel" placeholder="Enter grade level..." value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="learningObjectives">Learning Objectives</Label>
            <Textarea id="learningObjectives" placeholder="Enter learning objectives..." value={learningObjectives} onChange={(e) => setLearningObjectives(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="topics">Topics to be Covered</Label>
            <Textarea id="topics" placeholder="Enter topics to be covered..." value={topics} onChange={(e) => setTopics(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <Button onClick={handleGenerateLessonPlan} disabled={isLoading}>
            {isLoading ? "Generating Lesson Plan..." : "Generate Lesson Plan"}
          </Button>
          {error && <p className="text-red-500">{error}</p>}
          {lessonPlanItems.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="lessonPlan">Generated Lesson Plan</Label>
              <div>
                <h2 className="text-xl font-bold">{lessonTitle}</h2>
                <p><strong>Teaching Methods:</strong> {teachingMethods}</p>
                <p><strong>Intended Outcomes:</strong> {intendedOutcomes}</p>

                 <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Activities" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>

                {lessonPlanItems.map((item, index) => (
                  <div key={index} className="mb-4 border p-4 rounded">
                    <h3 className="text-lg font-semibold">Week {item.week}</h3>
                    <p><strong>Topic:</strong> {item.topic}</p>
                    <p><strong>Activities:</strong> {item.activities}</p>
                    <p><strong>Teaching Methods:</strong> {item.teachingMethods}</p>
                    <p><strong>Intended Outcomes:</strong> {item.intendedOutcomes}</p>
                    <p><strong>Resources:</strong> {item.resources.join(', ')}</p>
                    <p><strong>Assessment:</strong> {item.assessment}</p>
                    <p><strong>Notes:</strong> {item.notes}</p>
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
