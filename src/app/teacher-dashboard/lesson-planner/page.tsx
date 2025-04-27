"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, setDoc, serverTimestamp, query, getDocs, where } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { generateFlashcards } from '@/ai/flows/generate-flashcards';
import { generateLessonPlan, GenerateLessonPlanOutput } from '@/ai/flows/generate-lesson-plan';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Calendar as CalendarIcon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const GoalInput = () => {
    const { pending } = useFormStatus();

    return (
        <Button type="submit" aria-disabled={pending}>
            {pending ? "Generating Lesson Plan..." : "Generate Lesson Plan"}
        </Button>
    );
};

const LessonPlannerPage = () => {
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [learningObjectives, setLearningObjectives] = useState("");
  const [topics, setTopics] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [lessonPlanData, setLessonPlanData] = useState<GenerateLessonPlanOutput | null>(null);
  const [teachingMethods, setTeachingMethods] = useState("");
  const [intendedOutcomes, setIntendedOutcomes] = useState("");
  const [lessonPlanItems, setLessonPlanItems] = useState<LessonPlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, userClass } = useAuth();
  const { toast } = useToast()
  const [selectedGrade, setSelectedGrade] = useState<string>("grade-8");
  const [selectedClass, setSelectedClass] = useState(userClass || ""); // Initialize with userClass
  const [classes, setClasses] = useState<string[]>(["Grade 8", "Grade 6", "Grade 4"]); // Static class options
  const [flashcards, setFlashcards] = useState<string[]>([]);
  const subjectOptions = ['Math', 'Science', 'History', 'English'];
  const gradeLevelOptions = ['Grade 4', 'Grade 6', 'Grade 8'];
  const router = useRouter();
  const [openViewPlans, setOpenViewPlans] = useState(false);
  const [userLessonPlans, setUserLessonPlans] = useState<any[]>([]); // State to store user's lesson plans
  const [selectedLessonPlan, setSelectedLessonPlan] = useState<any | null>(null);


  useEffect(() => {
    const fetchUserLessonPlans = async () => {
      if (user) {
        const lessonPlansCollection = collection(db, `teachers/${user.uid}/lessonPlans`);
        const q = query(lessonPlansCollection);
        try {
          const querySnapshot = await getDocs(q);
          const plans = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          setUserLessonPlans(plans);
        } catch (e: any) {
          setError(e.message || "An error occurred while fetching lesson plans.");
          toast({
            variant: "destructive",
            title: "Error",
            description: e.message || "An error occurred while fetching lesson plans.",
          });
        }
      }
    };

    fetchUserLessonPlans();
  }, [user]);

  const handleViewLessonPlan = (plan: any) => {
    setSelectedLessonPlan(plan);
  };
  const handleGenerateFlashcards = async (topic: string, index: number) => {
    try {
      const aiGeneratedFlashcards = await generateFlashcards({ topic, numCards: 5, grade: selectedGrade });

       if(aiGeneratedFlashcards?.flashcards){
          setFlashcards(aiGeneratedFlashcards.flashcards.map(item => `${item.front} - ${item.back}`) || []);
       }
      toast({
        title: "Flashcards Generated",
        description: "AI has generated flashcards based on your input.",
      });
    } catch (e: any) {
      setFlashcards([]);
       console.error("Error generating flashcards:", e);

        setError(e.message || "An error occurred while generating the flashcards.");
         toast({
                variant: "destructive",
                title: "Error",
                description: e.message || "An error occurred while generating the flashcards.",
              });
    }
  }

  const handleGenerateLessonPlan = async () => {
    setIsLoading(true);
    setError(null);
    try {
        if (!user) {
            setError("User not logged in.");
            toast({
                variant: "destructive",
                title: "Error",
                description: "User not logged in.",
            });
            return;
        }

      const result = await generateLessonPlan({
        subject,
        gradeLevel,
        learningObjectives,
        topics,
        startDate,
        endDate,
        grade: selectedGrade,
        classId: selectedClass,
      });
      setLessonPlanData(result);
      toast({
          title: "Lesson Plan Generated",
          description: "AI has generated a lesson plan based on your input.",
      });

    } catch (e: any) {
      setError(e.message || "An error occurred while generating the lesson plan.");
         toast({
                variant: "destructive",
                title: "Error",
                description: e.message || "An error occurred while generating the lesson plan.",
              });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLessonPlan = async () => {
    if (!user || !lessonPlanData) {
      setError("User not logged in or no lesson plan to save.");
            toast({
                variant: "destructive",
                title: "Error",
                description: "User not logged in or no lesson plan to save.",
              });
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
        lessonTitle: lessonPlanData.lessonTitle,
        teachingMethods: lessonPlanData.teachingMethods,
        intendedOutcomes: lessonPlanData.intendedOutcomes,
        lessonPlan: lessonPlanData.lessonPlan,
        dateCreated: serverTimestamp(),
        status: "Draft",
        classId: selectedClass? selectedClass: undefined,
      });
           toast({
        title: "Lesson Plan Saved",
        description: "Your lesson plan has been saved successfully.",
      });
       router.refresh()
    } catch (e: any) {
      setError(e.message || "An error occurred while saving the lesson plan.");
            toast({
                variant: "destructive",
                title: "Error",
                description: e.message || "An error occurred while saving the lesson plan.",
              });
    }
  };

  // Prepare data for the chart
  const chartData = lessonPlanData?.lessonPlan?.map(item => ({
    name: `Week ${item.week}`,
    Activities: item.activities.length, // Example: Number of activities
  })) || [];

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle>AI-Powered Lesson Planner</CardTitle>
          <CardDescription>
            Enter your lesson goals and dates to generate a lesson plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">

          {/* Class Selection Dropdown */}
          <div className="grid gap-2">
            <Label htmlFor="class">Select Class</Label>
            <Select onValueChange={setSelectedClass} defaultValue={userClass? userClass:undefined}>
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
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="subject">Subject</Label>
                            <Select onValueChange={setSubject} defaultValue={subject}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Subject" />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjectOptions.map((option) => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="gradeLevel">Grade Level</Label>
                            <Select onValueChange={(value) => { setGradeLevel(value); setSelectedGrade(`grade-${value.split(" ")[1]}`); }} defaultValue={gradeLevel}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Grade Level" />
                                </SelectTrigger>
                                <SelectContent>
                                    {gradeLevelOptions.map((option) => (
                                        <SelectItem key={option} value={option}>{option}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
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
          <Button variant="secondary" onClick={() => setOpenViewPlans(true)}>
            <CalendarIcon className="mr-2 h-4 w-4" /> View Saved Lesson Plans
          </Button>

          {error && <p className="text-red-500">{error}</p>}
          {lessonPlanData && (
            <div className="grid gap-2">
              <Label htmlFor="lessonPlan">Generated Lesson Plan</Label>
              <div>
                <h2 className="text-xl font-bold">{lessonPlanData.lessonTitle}</h2>
                <p><strong>Teaching Methods:</strong> {lessonPlanData.teachingMethods}</p>
                <p><strong>Intended Outcomes:</strong> {lessonPlanData.intendedOutcomes}</p>

                 <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Activities" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>

                <div className="mb-4 border p-4 rounded">
                  <ScrollArea className="h-[400px] w-full rounded-md border">
                  {lessonPlanData.lessonPlan.map((item, index) => (
                    
                      <div key={index} className="mb-4  p-4 rounded">
                        <h3 className="text-lg font-semibold">Week {item.week}</h3>
                        <p><strong>Topic:</strong> {item.topic}</p>
                        <p><strong>Activities:</strong> {item.activities}</p>
                        <p><strong>Teaching Methods:</strong> {item.teachingMethods}</p>
                        <p><strong>Intended Outcomes:</strong> {item.intendedOutcomes}</p>
                        <p><strong>Resources:</strong> {item.resources.join(', ')}</p>
                        <p><strong>Assessment:</strong> {item.assessment}</p>
                        <p><strong>Notes:</strong> {item.notes}</p>
                        <Button className='mt-2' onClick={() => handleGenerateFlashcards(item.topic, index)}>
                         Generate Flashcards
                        </Button>
                      </div>
                    
                  ))}
                  </ScrollArea>
                </div>
                <Button onClick={handleSaveLessonPlan} disabled={isLoading}>
                  {isLoading ? "Saving Lesson Plan..." : "Save Lesson Plan"}
                </Button>
                 {/* Render Flashcards if available */}
                {flashcards.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-lg font-semibold">Generated Flashcards:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                      {flashcards.map((flashcard, index) => (
                        <Card key={index} className="border p-4 rounded shadow">
                          <CardContent className='p-4'>
                                <p>{flashcard}</p>
                            
                          </CardContent>
                         </Card>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={openViewPlans} onOpenChange={setOpenViewPlans}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Your Saved Lesson Plans</DialogTitle>
            <DialogDescription>
              View and manage your saved lesson plans.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] w-full rounded-md border">
          <div className="grid gap-4">
            {userLessonPlans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userLessonPlans.map((plan) => (
                  <Card key={plan.id} className="border p-4 rounded">
                    <CardHeader>
                      <CardTitle>{plan.lessonTitle}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Subject: {plan.subject}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Grade Level: {plan.gradeLevel}
                      </p>
                      <Button variant="secondary" onClick={() => handleViewLessonPlan(plan)}>
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p>No lesson plans saved yet.</p>
            )}
          </div>
          </ScrollArea>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setOpenViewPlans(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={selectedLessonPlan !== null} onOpenChange={() => setSelectedLessonPlan(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedLessonPlan?.lessonTitle}</DialogTitle>
            <DialogDescription>
              View details of the selected lesson plan.
            </DialogDescription>
          </DialogHeader>
          {selectedLessonPlan && (
            <div className="grid gap-4">
              <p>
                <strong>Subject:</strong> {selectedLessonPlan.subject}
              </p>
              <p>
                <strong>Grade Level:</strong> {selectedLessonPlan.gradeLevel}
              </p>
              <p>
                <strong>Learning Objectives:</strong> {selectedLessonPlan.learningObjectives}
              </p>
              <ScrollArea className="h-[400px] w-full rounded-md border">
              {selectedLessonPlan.lessonPlan && selectedLessonPlan.lessonPlan.map((item, index) => (
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
                </ScrollArea>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setSelectedLessonPlan(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LessonPlannerPage;
