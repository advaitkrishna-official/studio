'use client';

import React, { useState, useEffect, ChangeEvent, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter, // Import CardFooter
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
  getDocs,
  Timestamp,
  orderBy,
  documentId,
  DocumentData
} from 'firebase/firestore';
import { useAuth } from "@/components/auth-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ArrowLeft, ArrowRight } from "lucide-react";
import {

  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { assignTask } from '@/ai/flows/assign-task'; // Import assignTask
import { ScrollArea } from '@/components/ui/scroll-area';
import { generateMCQ, GenerateMCQOutput } from '@/ai/flows/generate-mcq';

type AssignmentType = 'Written' | 'MCQ' | 'Test' | 'Other';

interface McqQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface BaseAssignment {
  id: string;
  title: string;
  description: string;
  dueDate: Date | Timestamp; // Can be Date or Timestamp
  assignedTo: {
    classId: string;
    studentIds: string[];
  };
  createdBy: string;
  createdAt: Timestamp; // Assume Firestore Timestamp
  type: AssignmentType;
}

interface McqAssignment extends BaseAssignment {
  type: 'MCQ';
  mcqQuestions: McqQuestion[];
}

interface NonMcqAssignment extends BaseAssignment {
  type: Exclude<AssignmentType, 'MCQ'>;
  mcqQuestions?: McqQuestion[]; // Optional for other types
}

type Assignment = McqAssignment | NonMcqAssignment;

interface Submission {
  status: 'Not Started' | 'Submitted' | 'Overdue';
  submittedAt?: Timestamp | Date; // Can be Timestamp or Date
  answers?: string[];
  responseText?: string;
  grade?: string;
  feedback?: string;
}

const TeachersAssignmentHubPage: React.FC = () => {
  const { toast } = useToast();
  const { user, userClass } = useAuth();
  const [selectedClass, setSelectedClass] = useState(userClass || "");
  // Ensure all grades are available for selection
  const [classes, setClasses] = useState<string[]>([
    "Grade 1", "Grade 2", "Grade 3", "Grade 4",
    "Grade 5", "Grade 6", "Grade 7", "Grade 8"
  ]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isCreateAssignmentOpen, setIsCreateAssignmentOpen] = useState(false);
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(new Date());
  const [generatedMCQs, setGeneratedMCQs] = useState<GenerateMCQOutput | null>(null); // AI generated MCQs
  const [mcqTopic, setMcqTopic] = useState("");
  const [mcqNumQuestions, setMcqNumQuestions] = useState(5);
  const [isGeneratingMCQs, setIsGeneratingMCQs] = useState(false);
  const [generatingError, setGeneratingError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Added loading state

  const [newAssignment, setNewAssignment] = useState<{
    title: string;
    description: string;
    type: AssignmentType;
    mcqQuestions: McqQuestion[];
    assignedTo: { classId: string; studentIds: string[] };
  }>({
    title: '',
    description: '',
    type: 'Written',
    mcqQuestions: [],
    assignedTo: { classId: selectedClass, studentIds: [] },
  });
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0); // Track the current card index
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Update newAssignment.assignedTo.classId when selectedClass changes
    setNewAssignment(prev => ({ ...prev, assignedTo: { ...prev.assignedTo, classId: selectedClass } }));

    if (user && selectedClass) {
      setIsLoading(true); // Start loading when fetching
      const q = query(
        collection(db, 'assignments'),
        where('createdBy', '==', user.uid),
        where('assignedTo.classId', '==', selectedClass),
        orderBy('createdAt', 'desc') // Order by creation time, newest first
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const assignmentsData = snapshot.docs.map((doc) => {
          const data = doc.data() as DocumentData;
          let dueDate: Date | null = null;
          if (data.dueDate instanceof Timestamp) {
            dueDate = data.dueDate.toDate();
          } else if (data.dueDate instanceof Date) {
            dueDate = data.dueDate; // Already a Date
          } else if (data.dueDate?.seconds) { // Handle Firestore Timestamp object structure
             dueDate = new Timestamp(data.dueDate.seconds as number, data.dueDate.nanoseconds as number).toDate();
          }
          // else if (typeof data.dueDate === 'string') { // Handle ISO string date (less common now)
          //    try { dueDate = new Date(data.dueDate); } catch (e) { console.warn(`Invalid date string: ${data.dueDate}`); }
          // }

          return {
            id: doc.id,
            ...data,
            dueDate: dueDate, // Assign the converted Date object or null
            createdAt: data.createdAt, // Keep original timestamp if needed
            mcqQuestions: data.type === 'MCQ' ? data.mcqQuestions : undefined,
          } as Assignment;
        }).filter(a => a.dueDate); // Filter out assignments with invalid dates
        setAssignments(assignmentsData);
        setIsLoading(false); // Stop loading after data is processed
      }, (error) => {
         console.error("Error fetching assignments:", error);
         toast({ title: 'Error', description: 'Failed to load assignments.' });
         setIsLoading(false); // Stop loading on error
      });

      return () => unsubscribe();
    } else {
      setAssignments([]); // Clear assignments if no user or class selected
      setIsLoading(false); // Stop loading if no user/class
    }
  }, [user, selectedClass, toast]); // Add toast to dependency array

  const handleCreateAssignment = async () => {
    if (!user || !selectedClass) {
      toast({ title: 'Error', description: 'User or class not selected.' });
      return;
    }
    if (!newAssignment.title || !newAssignment.description || !newTaskDueDate) {
      toast({ title: 'Error', description: 'Please fill in title, description, and due date.' });
      return;
    }
     if (newAssignment.type === 'MCQ' && (!newAssignment.mcqQuestions || newAssignment.mcqQuestions.length === 0)) {
      toast({ title: 'Error', description: 'Please generate or add MCQ questions for an MCQ assignment.' });
      return;
     }

    try {
      await addDoc(collection(db, 'assignments'), {
        title: newAssignment.title,
        description: newAssignment.description,
        type: newAssignment.type,
        dueDate: newTaskDueDate, // Use state variable for due date
        mcqQuestions: newAssignment.type === 'MCQ' ? newAssignment.mcqQuestions : [], // Add MCQs if type is MCQ
        assignedTo: {
          classId: selectedClass,
          studentIds: [], // Assign to whole class by default
        },
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      toast({ title: 'Success', description: 'Assignment created successfully.' });
      // Reset form and close modal
      setNewAssignment({
        title: '', description: '', type: 'Written',
        mcqQuestions: [], assignedTo: { classId: selectedClass, studentIds: [] }
      });
      setNewTaskDueDate(new Date());
      setGeneratedMCQs(null); // Clear generated MCQs
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
     const gradeForAI = selectedClass.toLowerCase().replace(/\s+/g, '-'); // Use selectedClass
     if (!gradeForAI) {
        toast({ title: 'Error', description: 'Please select a class first.' });
        return;
     }
    setIsGeneratingMCQs(true);
    setGeneratingError(null);
    try {
      const result = await generateMCQ({ topic: mcqTopic, numQuestions: mcqNumQuestions, grade: gradeForAI });
      if (!result || !result.questions || result.questions.length === 0) {
         setGeneratingError("AI failed to generate questions for this topic.");
         toast({ title: 'Info', description: 'AI could not generate questions. Try a different topic.' });
      } else {
        setGeneratedMCQs(result);
        setNewAssignment({ ...newAssignment, mcqQuestions: result.questions as McqQuestion[] || [] });
        toast({ title: 'Success', description: 'MCQs generated. Review and create the assignment.' });
        setCurrentCardIndex(0); // Reset card index
      }
    } catch (e: any) {
      setGeneratingError(e.message || "An error occurred while generating MCQs.");
      toast({
        variant: "destructive",
        title: "Error Generating MCQs",
        description: e.message || "An unknown error occurred.",
      });
    } finally {
      setIsGeneratingMCQs(false);
    }
  };

   const nextCard = () => {
     if (generatedMCQs && generatedMCQs.questions) {
       setCurrentCardIndex((prevIndex) =>
         Math.min(prevIndex + 1, generatedMCQs.questions.length - 1)
       );
     }
   };

   const prevCard = () => {
     setCurrentCardIndex((prevIndex) => Math.max(prevIndex - 1, 0));
   };

   // Helper function to safely format date
   const formatDate = (date: Date | Timestamp | null | undefined): string => {
     if (!date) return 'No due date';
     let dateObj: Date | null = null;
      if (date instanceof Timestamp) {
          dateObj = date.toDate();
      } else if (date instanceof Date) {
         dateObj = date;
      } else if (typeof date === 'object' && date?.seconds) { // Handle plain object Timestamps
        dateObj = new Timestamp(date.seconds as number, date.nanoseconds as number).toDate();
      }

     if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
       return format(dateObj, "PPP"); // Format like "Jun 21, 2024"
     }
     return 'Invalid Date';
   };


  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-5xl mx-auto shadow-lg border border-gray-200">
        <CardHeader>
          <CardTitle>Teachers Assignment Hub</CardTitle>
          <CardDescription>Create and manage assignments for your class.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">

          <div className="flex flex-col sm:flex-row gap-4 items-center">
             <div className="w-full sm:w-auto">
               <Label htmlFor="class">Select Class</Label>
               <Select onValueChange={setSelectedClass} value={selectedClass}>
                 <SelectTrigger className="min-w-[180px]">
                   <SelectValue placeholder="Select a class" />
                 </SelectTrigger>
                 <SelectContent>
                   {classes.map((cls) => (
                     <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>

             <Button onClick={() => setIsCreateAssignmentOpen(true)} className="w-full sm:w-auto">
               Create New Assignment
             </Button>
          </div>

          {isLoading ? (
            <p className="text-center text-muted-foreground">Loading assignments...</p>
          ) : assignments.length > 0 ? (
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
                    <TableCell><Badge variant="secondary">{assignment.type}</Badge></TableCell>
                    <TableCell>{formatDate(assignment.dueDate)}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(assignment)}>View Details</Button>
                      {/* Add Delete/Edit buttons here later */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-4">
              No assignments created for {selectedClass} yet.
            </p>
          )}
        </CardContent>
      </Card>

       {/* View Details Dialog */}
       <Dialog open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
           <DialogContent className="max-w-3xl p-6"> {/* Increased max-width and padding */}
               <DialogHeader className="mb-4"> {/* Added margin-bottom */}
                   <DialogTitle className="text-xl font-semibold">{selectedAssignment?.title}</DialogTitle>
                   <DialogDescription>{selectedAssignment?.description}</DialogDescription>
               </DialogHeader>
               {selectedAssignment && (
                   <Card className="mt-4 border-none shadow-none">
                       <CardContent className="p-0 space-y-4"> {/* Increased spacing */}
                           {/* Changed from <p> to <div> to allow block elements like Badge inside */}
                           <div className="text-sm"><strong>Type:</strong> <Badge variant="outline">{selectedAssignment.type}</Badge></div>
                           <p className="text-sm"><strong>Due Date:</strong> {formatDate(selectedAssignment.dueDate)}</p>
                           {selectedAssignment.type === 'MCQ' && selectedAssignment.mcqQuestions && (
                               <div className="mt-4">
                                   <h4 className="text-md font-semibold mb-2">MCQ Questions</h4>
                                   <ScrollArea className="h-[300px] border rounded-md p-3 bg-muted/50">
                                       <ul className="space-y-3">
                                           {selectedAssignment.mcqQuestions.map((question, index) => (
                                               <li key={index} className="text-sm p-2 bg-white rounded shadow-sm">
                                                   <p className="font-medium mb-1">{index + 1}. {question.question}</p>
                                                   <ul className="list-disc pl-5 mt-1 text-xs text-muted-foreground space-y-0.5">
                                                       {question.options.map((option, i) => (
                                                           <li key={i} className={option === question.correctAnswer ? 'text-green-600 font-medium' : ''}>
                                                               {String.fromCharCode(65 + i)}. {option}
                                                               {option === question.correctAnswer && " (Correct)"}
                                                           </li>
                                                       ))}
                                                   </ul>
                                               </li>
                                           ))}
                                       </ul>
                                   </ScrollArea>
                               </div>
                           )}
                           {/* Add logic here to display student submissions for this assignment */}
                       </CardContent>
                   </Card>
               )}
               <DialogFooter className="mt-6"> {/* Added margin-top */}
                   <Button type="button" variant="secondary" onClick={() => setSelectedAssignment(null)}>Close</Button>
               </DialogFooter>
           </DialogContent>
       </Dialog>


       {/* Create New Assignment Dialog */}
        <Dialog open={isCreateAssignmentOpen} onOpenChange={setIsCreateAssignmentOpen}>
          <DialogContent className="max-w-[700px] p-8 sm:p-6 md:max-w-3xl"> {/* Responsive max-width */}
            <DialogHeader>
              {/* Title moved below for better structure in grid */}
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6"> {/* Responsive Grid */}
              {/* Left Column */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Assignment Details</h2> {/* Moved Title Here */}
                <div>
                  <Label htmlFor="new-title">Title</Label>
                  <Input id="new-title" value={newAssignment.title} onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })} placeholder="Assignment Title" />
                </div>
                <div>
                  <Label htmlFor="new-description">Description</Label>
                  <Textarea id="new-description" value={newAssignment.description} onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })} placeholder="Assignment Description" className="min-h-[120px]" />
                </div>
                <div>
                  <Label htmlFor="new-type">Type</Label>
                  <Select value={newAssignment.type} onValueChange={(value) => setNewAssignment({ ...newAssignment, type: value as AssignmentType })}>
                    <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger> {/* Added placeholder */}
                    <SelectContent>
                      <SelectItem value="Written">Written</SelectItem>
                      <SelectItem value="MCQ">MCQ</SelectItem>
                      <SelectItem value="Test">Test</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="new-dueDate">Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !newTaskDueDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newTaskDueDate ? format(newTaskDueDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={newTaskDueDate} onSelect={setNewTaskDueDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Right Column (MCQ) */}
              <div className="space-y-4">
                {newAssignment.type === 'MCQ' && (
                  <>
                    <h2 className="text-xl font-semibold">MCQ Generator</h2>
                    <div>
                      <Label htmlFor="mcq-topic">Topic</Label>
                      <Input id="mcq-topic" value={mcqTopic} onChange={(e) => setMcqTopic(e.target.value)} placeholder="Topic for MCQs" />
                    </div>
                    <div>
                      <Label htmlFor="mcq-num">Number of Questions</Label>
                      <Input id="mcq-num" type="number" value={mcqNumQuestions} onChange={(e) => setMcqNumQuestions(parseInt(e.target.value) || 1)} min="1" max="20" />
                    </div>
                    <Button onClick={handleGenerateMCQs} disabled={isGeneratingMCQs || !mcqTopic} className="w-full">
                      {isGeneratingMCQs ? 'Generating...' : 'Generate MCQs'}
                    </Button>
                    {generatingError && <p className="text-sm text-red-500">{generatingError}</p>}

                    {generatedMCQs && generatedMCQs.questions && generatedMCQs.questions.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <Label>Generated MCQs ({currentCardIndex + 1} of {generatedMCQs.questions.length})</Label>
                        <Card ref={cardRef} className="p-4 border rounded h-[200px] overflow-y-auto bg-muted/30 shadow-inner">
                          <p className="font-medium text-sm mb-2">{generatedMCQs.questions[currentCardIndex].question}</p>
                          <ul className="list-disc pl-5 text-xs space-y-1">
                            {generatedMCQs.questions[currentCardIndex].options.map((option, i) => (
                              <li key={i} className={option === generatedMCQs.questions[currentCardIndex].correctAnswer ? 'text-green-700 font-semibold' : ''}>
                                {option} {option === generatedMCQs.questions[currentCardIndex].correctAnswer && ' (Correct)'}
                              </li>
                            ))}
                          </ul>
                        </Card>
                        <div className="flex justify-between items-center mt-2">
                          <Button variant="outline" size="sm" onClick={prevCard} disabled={currentCardIndex === 0}>
                            <ArrowLeft className="h-4 w-4 mr-1" /> Prev
                          </Button>
                          <Button variant="outline" size="sm" onClick={nextCard} disabled={currentCardIndex === generatedMCQs.questions.length - 1}>
                            Next <ArrowRight className="h-4 w-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {newAssignment.type !== 'MCQ' && (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 border rounded-md border-dashed">
                    MCQ options will appear here when the assignment type is set to MCQ.
                  </div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <DialogFooter className="pt-6 mt-6 sm:mt-0 flex justify-end gap-4"> {/* Use flex for button alignment */}
                <Button variant="secondary" onClick={() => setIsCreateAssignmentOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateAssignment} className="bg-primary hover:bg-primary/90"> {/* Primary color button */}
                  Create Assignment
                </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

    </div>
  );
};

export default TeachersAssignmentHubPage;
