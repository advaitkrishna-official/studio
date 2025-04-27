'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
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
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { CalendarIcon } from "lucide-react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { assignTask } from '@/ai/flows/assign-task'; // Import assignTask
import { GenerateMCQOutput } from '@/ai/flows/generate-mcq';

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

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-4xl mx-auto">
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
        <DialogTrigger asChild>
          {/* You can use the same button or a different one */}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
            <DialogDescription>
              Create an assignment for your selected class.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
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

            {/* MCQ Builder - Conditionally Rendered */}
            {newAssignment.type === 'MCQ' && (
              <div>
                {newAssignment.mcqQuestions?.map((mcq, index) => (
                  <Card key={index} className="mb-4">
                    <CardHeader>
                      <CardTitle>Question {index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-2">
                      <div className="grid gap-1">
                        <Label htmlFor={`question-${index}`}>Question</Label>
                        <Input id={`question-${index}`} placeholder="Enter question" value={mcq.question} onChange={(e) => {
                          const updatedQuestions = [...newAssignment.mcqQuestions];
                          updatedQuestions[index] = { ...mcq, question: e.target.value };
                          setNewAssignment({ ...newAssignment, mcqQuestions: updatedQuestions });
                        }} />
                      </div>
                      {/* Correctly mapping 4 options */}
                      {[0, 1, 2, 3].map((optionIndex) => (
                        <div className="grid gap-1" key={optionIndex}>
                          <Label htmlFor={`option-${optionIndex}-${index}`}>Option {String.fromCharCode(65 + optionIndex)}</Label>
                          <Input id={`option-${optionIndex}-${index}`} placeholder={`Enter option ${String.fromCharCode(65 + optionIndex)}`} value={mcq.options[optionIndex] || ''} onChange={(e) => {
                            const updatedQuestions = [...newAssignment.mcqQuestions];
                            const updatedOptions = [...(mcq.options || [])];
                            updatedOptions[optionIndex] = e.target.value;
                            updatedQuestions[index] = { ...mcq, options: updatedOptions };
                            setNewAssignment({ ...newAssignment, mcqQuestions: updatedQuestions });
                          }} />
                        </div>
                      ))}
                      <div className="grid gap-1">
                        <Label htmlFor={`correctAnswer-${index}`}>Correct Answer</Label>
                        <Select onValueChange={(value) => {
                          const updatedQuestions = [...newAssignment.mcqQuestions];
                          updatedQuestions[index] = { ...mcq, correctAnswer: value };
                          setNewAssignment({ ...newAssignment, mcqQuestions: updatedQuestions });
                        }} defaultValue={mcq.correctAnswer}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select correct answer" />
                          </SelectTrigger>
                          <SelectContent>
                            {[0, 1, 2, 3].map((optionIndex) => (
                              <SelectItem value={String.fromCharCode(65 + optionIndex)} key={optionIndex}>{String.fromCharCode(65 + optionIndex)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <Button variant="outline" size="sm" onClick={() => {
                  setNewAssignment({
                    ...newAssignment,
                    mcqQuestions: [...newAssignment.mcqQuestions, { question: '', options: ['', '', '', ''], correctAnswer: '' }],
                  });
                }}>+ Add Question</Button>
              </div>
            )}

          </div>

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
