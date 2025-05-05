'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  query,
  getDocs,
  onSnapshot,
  where,
  DocumentData,
  QuerySnapshot,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { format } from 'date-fns';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar as CalendarIcon } from 'lucide-react';
import { generateFlashcards } from '@/ai/flows/generate-flashcards';
import { generateLessonPlan, GenerateLessonPlanOutput } from '@/ai/flows/generate-lesson-plan';
import { useToast } from '@/hooks/use-toast';
import { DashboardNavbar } from '@/app/teacher-dashboard/page';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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
  const [subject, setSubject] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [learningObjectives, setLearningObjectives] = useState('');
  const [topics, setTopics] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [lessonPlanData, setLessonPlanData] = useState<GenerateLessonPlanOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user, userClass } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [selectedGrade, setSelectedGrade] = useState<string>('grade-8');
  const [selectedClass, setSelectedClass] = useState<string>(userClass || '');
  const [classes, setClasses] = useState<string[]>([
    'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4',
    'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8',
  ]);
  const subjectOptions = ['Math', 'Science', 'History', 'English'];
  const gradeLevelOptions = [...classes];

  const [flashcards, setFlashcards] = useState<string[]>([]);

  const [openViewPlans, setOpenViewPlans] = useState(false);
  const [userLessonPlans, setUserLessonPlans] = useState<any[]>([]);
  const [selectedLessonPlan, setSelectedLessonPlan] = useState<any | null>(null);

  // Fetch saved lesson plans
  useEffect(() => {
    if (!user) return;
    const lessonPlansRef = collection(db, `teachers/${user.uid}/lessonPlans`);
    const q = query(lessonPlansRef);
    getDocs(q)
      .then(snapshot => {
        setUserLessonPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      })
      .catch(e => {
        setError(e.message);
        toast({ variant: 'destructive', title: 'Error', description: e.message });
      });
  }, [user, toast]);

  const handleGenerateFlashcards = async (topic: string) => {
    try {
      const result = await generateFlashcards({ topic, numCards: 5, grade: selectedGrade });
      setFlashcards(result.flashcards.map(f => `${f.front} – ${f.back}`));
      toast({ title: 'Flashcards Generated', description: 'AI has generated flashcards.' });
    } catch (e: any) {
      setError(e.message);
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const handleGenerateLessonPlan = async () => {
    if (!user) {
      setError('Not logged in');
      return toast({ variant: 'destructive', title: 'Error', description: 'Please log in.' });
    }
    setIsLoading(true);
    setError(null);
    try {
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
      toast({ title: 'Lesson Plan Generated', description: 'AI has created your plan.' });
    } catch (e: any) {
      setError(e.message);
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveLessonPlan = async () => {
    if (!user || !lessonPlanData) {
      return toast({ variant: 'destructive', title: 'Error', description: 'Nothing to save.' });
    }
    try {
      await addDoc(collection(db, `teachers/${user.uid}/lessonPlans`), {
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
        status: 'Draft',
        classId: selectedClass,
      });
      toast({ title: 'Saved', description: 'Lesson plan saved.' });
      router.refresh();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const chartData = lessonPlanData?.lessonPlan.map(item => ({
    name: `Week ${item.week}`,
    Activities: item.activities.length,
  })) ?? [];

  const handleViewLessonPlan = (plan: any) => setSelectedLessonPlan(plan);
  const handleDeleteLessonPlan = async (planId: string) => {
    if (!user) return;
    try {
      const ref = doc(db, `teachers/${user.uid}/lessonPlans`, planId);
      await deleteDoc(ref);
      setUserLessonPlans(plans => plans.filter(p => p.id !== planId));
      toast({ title: 'Deleted', description: 'Lesson plan removed.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  return (
    <>
      <DashboardNavbar />

      <div className="container mx-auto py-8">
        <Card className="max-w-5xl mx-auto">
          <CardHeader>
            <CardTitle>AI-Powered Lesson Planner</CardTitle>
            <CardDescription>Define goals and dates to generate a plan.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {/* Class Selection */}
            <div className="grid gap-2">
              <Label htmlFor="class">Select Class</Label>
              <Select defaultValue={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Subject & Grade */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Select defaultValue={subject} onValueChange={setSubject}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                  <SelectContent>
                    {subjectOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="gradeLevel">Grade Level</Label>
                <Select
                  defaultValue={gradeLevel}
                  onValueChange={val => {
                    setGradeLevel(val);
                    setSelectedGrade(`grade-${val.split(' ')[1]}`);
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select Grade Level" /></SelectTrigger>
                  <SelectContent>
                    {gradeLevelOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Objectives, Topics, Dates */}
            <div className="grid gap-2">
              <Label htmlFor="learningObjectives">Learning Objectives</Label>
              <Textarea
                id="learningObjectives"
                placeholder="Enter objectives..."
                value={learningObjectives}
                onChange={e => setLearningObjectives(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="topics">Topics to be Covered</Label>
              <Textarea
                id="topics"
                placeholder="Enter topics..."
                value={topics}
                onChange={e => setTopics(e.target.value)}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>

            <Button onClick={handleGenerateLessonPlan} disabled={isLoading}>
              {isLoading ? 'Generating Lesson Plan...' : 'Generate Lesson Plan'}
            </Button>
            <Button variant="secondary" onClick={() => setOpenViewPlans(true)}>
              <CalendarIcon className="mr-2 h-4 w-4" /> View Saved Lesson Plans
            </Button>

            {error && <p className="text-red-500">{error}</p>}

            {/* Generated Plan */}
            {lessonPlanData && (
              <div className="grid gap-4">
                <Label htmlFor="lessonPlan">Generated Lesson Plan</Label>
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
                    {lessonPlanData.lessonPlan.map((item: LessonPlanItem, idx: number) => (
                      <div key={idx} className="mb-4 border p-4 rounded">
                        <Button className="mt-2" onClick={() => handleGenerateFlashcards(item.topic)}>
                          Generate Flashcards
                        </Button>
                        <h3 className="text-lg font-semibold">Week {item.week}</h3>
                        <p><strong>Topic:</strong> {item.topic}</p>
                        <p><strong>Activities:</strong> {item.activities}</p>
                        <p><strong>Teaching Methods:</strong> {item.teachingMethods}</p>
                        <p><strong>Intended Outcomes:</strong> {item.intendedOutcomes}</p>
                        <p><strong>Resources:</strong> {item.resources.join(', ')}</p>
                        <p><strong>Assessment:</strong> {item.assessment}</p>
                        {item.notes && <p><strong>Notes:</strong> {item.notes}</p>}
                      </div>
                    ))}
                  </ScrollArea>
                  <Button onClick={handleSaveLessonPlan} disabled={isLoading}>
                    {isLoading ? 'Saving Lesson Plan...' : 'Save Lesson Plan'}
                  </Button>
                </div>

                {/* Flashcards */}
                {flashcards.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-lg font-semibold">Generated Flashcards:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                      {flashcards.map((card, i) => (
                        <Card key={i} className="border p-4 rounded shadow">
                          <CardContent className="p-4">
                            <p>{card}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Saved Plans Dialog */}
        <Dialog open={openViewPlans} onOpenChange={setOpenViewPlans}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Your Saved Lesson Plans</DialogTitle>
              <DialogDescription>View and manage your saved lesson plans.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[400px] w-full rounded-md border">
              {userLessonPlans.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {userLessonPlans.map(plan => (
                    <Card key={plan.id} className="border p-4 rounded">
                      <CardHeader>
                        <CardTitle>{plan.lessonTitle}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">Subject: {plan.subject}</p>
                        <p className="text-sm text-muted-foreground">Grade: {plan.gradeLevel}</p>
                        <div className="flex justify-between mt-4">
                          <Button variant="secondary" onClick={() => handleViewLessonPlan(plan)}>
                            View Details
                          </Button>
                          <Button variant="destructive" onClick={() => handleDeleteLessonPlan(plan.id)}>
                            Delete
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p>No lesson plans saved yet.</p>
              )}
            </ScrollArea>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setOpenViewPlans(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Single Plan Dialog */}
        <Dialog open={!!selectedLessonPlan} onOpenChange={() => setSelectedLessonPlan(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{selectedLessonPlan?.lessonTitle}</DialogTitle>
              <DialogDescription>Details of the selected lesson plan.</DialogDescription>
            </DialogHeader>
            {selectedLessonPlan && (
              <div className="grid gap-4">
                <p><strong>Subject:</strong> {selectedLessonPlan.subject}</p>
                <p><strong>Grade Level:</strong> {selectedLessonPlan.gradeLevel}</p>
                <p><strong>Learning Objectives:</strong> {selectedLessonPlan.learningObjectives}</p>
                <ScrollArea className="h-[400px] w-full rounded-md border">
                  {selectedLessonPlan.lessonPlan.map((item: LessonPlanItem, idx: number) => (
                    <div key={idx} className="mb-4 border p-4 rounded">
                      <h3 className="text-lg font-semibold">Week {item.week}</h3>
                      <p><strong>Topic:</strong> {item.topic}</p>
                      <p><strong>Activities:</strong> {item.activities}</p>
                      <p><strong>Teaching Methods:</strong> {item.teachingMethods}</p>
                      <p><strong>Intended Outcomes:</strong> {item.intendedOutcomes}</p>
                      <p><strong>Resources:</strong> {item.resources.join(', ')}</p>
                      <p><strong>Assessment:</strong> {item.assessment}</p>
                      {item.notes && <p><strong>Notes:</strong> {item.notes}</p>}
                    </div>
                  ))}
                </ScrollArea>
              </div>
            )}
            <DialogFooter>
              <Button variant="secondary" onClick={() => setSelectedLessonPlan(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default LessonPlannerPage;
