'use client';

import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from "@/components/auth-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { CalendarIcon, ArrowLeft, ArrowRight } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { assignTask } from '@/ai/flows/assign-task'; // Import assignTask
import { generateMCQ, GenerateMCQOutput } from '@/ai/flows/generate-mcq';

type AssignmentType = 'Written' | 'MCQ' | 'Test' | 'Other';

interface BaseAssignment {
  id: string;
  title: string;
  description: string;
  dueDate: any;
  assignedTo: {
    classId: string;
    studentIds: string[];
  };
  createdBy: string;
  createdAt: any;
}

interface McqAssignment extends BaseAssignment {
  type: 'MCQ';
  mcqQuestions: {
    question: string;
    options: string[];
    correctAnswer: string;
  }[];
}

interface NonMcqAssignment extends BaseAssignment {
    type: Exclude<AssignmentType, 'MCQ'>;
  mcqQuestions?: {
    question: string;
    options: string[];
    correctAnswer: string;
  }[];
}

type Assignment = McqAssignment | NonMcqAssignment;

interface Submission {
  status: 'Not Started' | 'Submitted' | 'Overdue';
  submittedAt?: any;
  answers?: string[];
  responseText?: string;
  grade?: string;
  feedback?: string;
}

const TeachersAssignmentHubPage: React.FC = () => {
  const { toast } = useToast();
  const { user, userClass } = useAuth();
  const [selectedClass, setSelectedClass] = useState(userClass || "");
  const [classes, setClasses] = useState<string[]>(["Grade 8", "Grade 6", "Grade 4"]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(new Date());
  const [generatedMCQs, setGeneratedMCQs] = useState<GenerateMCQOutput | null>(null); // AI generated MCQs
  const [mcqTopic, setMcqTopic] = useState("");
  const [mcqNumQuestions, setMcqNumQuestions] = useState(5);
  const [isGeneratingMCQs, setIsGeneratingMCQs] = useState(false);
  const [generatingError, setGeneratingError] = useState<string | null>(null);

  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    type: 'Written' as AssignmentType,
    dueDate: new Date(),
    mcqQuestions: [] as { question: string; options: string[]; correctAnswer: string }[], // Properly typed
    assignedTo: {
      classId: '',
      studentIds: [] as string[],
    },
  });
    const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
    const [currentCardIndex, setCurrentCardIndex] = useState(0); // Track the current card index
    const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && selectedClass) {
      const q = query(
        collection(db, 'assignments'),
        where('createdBy', '==', user.uid),
        where('assignedTo.classId', '==', selectedClass)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const assignmentsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          dueDate: doc.data().dueDate ? (doc.data().dueDate instanceof Date ? doc.data().dueDate : doc.data().dueDate.toDate()) : null,
        })) as Assignment[];
        setAssignments(assignmentsData);
      });

      return () => unsubscribe();
    }
  }, [user, selectedClass]);

  const handleCreateAssignment = async () => {
    if (!user || !selectedClass) return;

    try {
      await addDoc(collection(db, 'assignments'), {
        title: newAssignment.title,
        description: newAssignment.description,
        type: newAssignment.type,
        dueDate: newTaskDueDate,
        mcqQuestions: newAssignment.mcqQuestions,
        assignedTo: {
          classId: selectedClass,
          studentIds: [], // You can modify this based on individual student assignments
        },
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Success', description: 'Assignment created successfully.' });
      setIsCreateAssignmentOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to create assignment.' });
      console.error(error);
    }
  };
    const handleViewDetails = (assignment: Assignment) => {
        setSelectedAssignment(assignment);
    };

    const handleGenerateMCQs = async () => {
      setIsGeneratingMCQs(true);
      setGeneratingError(null);
      try {
        const result = await generateMCQ({ topic: mcqTopic, numQuestions: mcqNumQuestions });
        setGeneratedMCQs(result);
        setNewAssignment({ ...newAssignment, mcqQuestions: result?.questions || [] });
        toast({ title: 'Success', description: 'MCQs generated successfully. You can assign them directly.' });
        setCurrentCardIndex(0); // Reset card index after generating new MCQs
      } catch (e: any) {
        setGeneratingError(e.message || "An error occurred while generating MCQs.");
          toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to generate MCQs. Please try again.",
          });
      } finally {
        setIsGeneratingMCQs(false);
      }
    };

  const handlePreviousCard = () => {
    setCurrentCardIndex((prevIndex) => Math.max(prevIndex - 1, 0));
  };

  const handleNextCard = () => {
    setCurrentCardIndex((prevIndex) => Math.min(prevIndex + 1, (generatedMCQs?.questions?.length || 1) - 1));
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle>Teachers Assignment Hub</CardTitle>
          <CardDescription>Create and manage assignments for your class.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-2">
            <Label htmlFor="class">Select Class</Label>
            <Select onValueChange={setSelectedClass} defaultValue={selectedClass}>
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

          <Button onClick={() => setIsCreateAssignmentOpen(true)}>Create New Assignment</Button>

          {assignments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell>{assignment.title}</TableCell>
                    <TableCell><Badge>{assignment.type}</Badge></TableCell>
                    <TableCell>
                      {assignment.dueDate ? (
                        (assignment.dueDate instanceof Date ? assignment.dueDate : assignment.dueDate.toDate()).toLocaleString()
                      ) : (
                        'No due date'
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(assignment)}>View Details</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p>No assignments created yet.</p>
          )}
        </CardContent>
      </Card>
        <Dialog open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{selectedAssignment?.title}</DialogTitle>
                    <DialogDescription>{selectedAssignment?.description}</DialogDescription>
                </DialogHeader>
                {selectedAssignment && (
                    <Card className="mt-4">
                        <CardContent>
                            <p><strong>Type:</strong> <Badge>{selectedAssignment.type}</Badge></p>
                            <p><strong>Due Date:</strong> {selectedAssignment.dueDate?.toDate().toLocaleString()}</p>
                            {selectedAssignment.type === 'MCQ' && selectedAssignment.mcqQuestions && (
                                <div>
                                    <h4 className="text-lg font-semibold mt-4">MCQ Questions</h4>
                                    {selectedAssignment.mcqQuestions.map((question, index) => (
                                        <div key={index} className="mb-4">
                                            <p>{index + 1}. {question.question}</p>
                                            <ul>
                                                {question.options.map((option, i) => (
                                                    <li key={i}>{String.fromCharCode(65 + i)}. {option}</li>
                                                ))}
                                            </ul>
                                            <p><strong>Correct Answer:</strong> {question.correctAnswer}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
                <DialogFooter>
                    <Button type="button" onClick={() => setSelectedAssignment(null)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      <Dialog open={isCreateAssignmentOpen} onOpenChange={setIsCreateAssignmentOpen}>
        <DialogContent className="flex">
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
            <DialogDescription>
              Create an assignment for your selected class.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 w-1/2">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Assignment title" value={newAssignment.title} onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Assignment description" value={newAssignment.description} onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select onValueChange={(value) => setNewAssignment({ ...newAssignment, type: value as AssignmentType })} defaultValue={newAssignment.type}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select assignment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Written">Written</SelectItem>
                  <SelectItem value="MCQ">MCQ</SelectItem>
                  <SelectItem value="Test">Test</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
            </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={newTaskDueDate ? format(newTaskDueDate, "yyyy-MM-dd") : ""}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewTaskDueDate(new Date(e.target.value))}
              />
            </div>
          </div>

          {newAssignment.type === 'MCQ' && (
            <div className="w-1/2">
              <div className="grid gap-2 mb-4">
                <Label htmlFor="mcqTopic">MCQ Topic</Label>
                <Input
                  id="mcqTopic"
                  placeholder="Topic for MCQ questions"
                  value={mcqTopic}
                  onChange={(e) => setMcqTopic(e.target.value)}
                />
              </div>
              <div className="grid gap-2 mb-4">
                <Label htmlFor="mcqNumQuestions">Number of Questions</Label>
                <Input
                  id="mcqNumQuestions"
                  type="number"
                  placeholder="Number of questions to generate"
                  value={mcqNumQuestions.toString()}
                  onChange={(e) => setMcqNumQuestions(parseInt(e.target.value))}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateMCQs}
                disabled={isGeneratingMCQs}
              >
                {isGeneratingMCQs ? "Generating MCQs..." : "Generate MCQs"}
              </Button>
              {generatingError && <p className="text-red-500">{generatingError}</p>}
              {generatedMCQs && generatedMCQs.questions && (
                <div className="mt-4 relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2"
                    onClick={handlePreviousCard}
                    disabled={currentCardIndex === 0}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Card className="w-full h-48 overflow-hidden">
                    <CardContent className="flex items-center justify-center h-full">
                      {generatedMCQs.questions[currentCardIndex] ? (
                        <div>
                          <p className="font-bold">{generatedMCQs.questions[currentCardIndex].question}</p>
                          <ul>
                            {generatedMCQs.questions[currentCardIndex].options.map((option, i) => (
                              <li key={i}>{String.fromCharCode(65 + i)}. {option}</li>
                            ))}
                          </ul>
                          <p><strong>Correct Answer:</strong> {generatedMCQs.questions[currentCardIndex].correctAnswer}</p>
                        </div>
                      ) : (
                        <p>No MCQs generated.</p>
                      )}
                    </CardContent>
                  </Card>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={handleNextCard}
                    disabled={currentCardIndex === generatedMCQs.questions.length - 1}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsCreateAssignmentOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleCreateAssignment}>Create Assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeachersAssignmentHubPage;
