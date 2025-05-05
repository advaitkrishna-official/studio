// src/app/teacher-dashboard/teachers-assignment-hub/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  DocumentData,
  doc, // Import doc for submission query
  getDocs, // Import getDocs for submission query
} from 'firebase/firestore';
import { format, isPast } from 'date-fns';
import { Calendar as CalendarIcon, ArrowLeft, ArrowRight, Plus, Trash2, Eye } from 'lucide-react'; // Added icons
import { generateMCQ, GenerateMCQOutput } from '@/ai/flows/generate-mcq'; // Assume this path is correct
import { isTimestamp } from '@/lib/utils'; // Import the type guard

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
  dueDate: Date; // Use Date object consistently
  assignedTo: { classId: string; studentIds: string[] };
  createdBy: string;
  createdAt: Timestamp; // Keep as Timestamp from Firestore initially
  type: AssignmentType;
}

interface McqAssignment extends BaseAssignment {
  type: 'MCQ';
  mcqQuestions: McqQuestion[];
}

interface NonMcqAssignment extends BaseAssignment {
  type: Exclude<AssignmentType, 'MCQ'>;
  mcqQuestions?: McqQuestion[]; // Optional for non-MCQ types
}

type Assignment = McqAssignment | NonMcqAssignment;

// --- Submission Data Structure (Example) ---
interface Submission {
    id: string; // Typically the student's UID
    status: 'Not Started' | 'Submitted' | 'Overdue' | 'Graded';
    submittedAt?: Timestamp;
    answers?: string[]; // For MCQ
    responseText?: string; // For Written/Other
    grade?: number | string;
    feedback?: string;
}
// --- End Submission Data Structure ---

// Robust date formatting function
const formatDate = (d: Date | Timestamp | undefined | null): string => {
  if (!d) return 'No Date';
  let dateObj: Date | null = null;
  if (isTimestamp(d)) { // Use the type guard
      dateObj = d.toDate();
  } else if (d instanceof Date) {
      dateObj = d;
  }

  if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
      try {
          // Format to include time, adjust format as needed
          return format(dateObj, 'PPP p'); // Example: Jun 20, 2024, 12:00 PM
      } catch (e) {
          console.error("Error formatting date:", e);
          return 'Invalid Date';
      }
  }
  return 'Invalid Date';
};


export default function TeachersAssignmentHubPage() {
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth(); // Removed userClass, rely on selectedClass

  const [selectedClass, setSelectedClass] = useState(''); // Start with no class selected
  const [classes] = useState<string[]>([
    'Grade 1','Grade 2','Grade 3','Grade 4',
    'Grade 5','Grade 6','Grade 7','Grade 8'
  ]);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Default 1 week out

  const [newAssignment, setNewAssignment] = useState({
    title: '',
    description: '',
    type: 'Written' as AssignmentType,
    mcqQuestions: [] as McqQuestion[],
    assignedTo: { classId: selectedClass, studentIds: [] as string[] },
  });

  const [generatedMCQs, setGeneratedMCQs] = useState<{ questions: McqQuestion[] } | null>(null);
  const [mcqTopic, setMcqTopic] = useState('');
  const [mcqCount, setMcqCount] = useState(5);
  const [isGenMCQ, setIsGenMCQ] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);
  const [mcqCurrentIndex, setMcqCurrentIndex] = useState(0);

  const [loadingAssignments, setLoadingAssignments] = useState(false); // Initial state false, set true before fetch
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  // --- State for View Details Dialog ---
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  // --- End State for View Details Dialog ---


  // Effect to update newAssignment when selectedClass changes
  useEffect(() => {
    setNewAssignment(a => ({
      ...a,
      assignedTo: { ...a.assignedTo, classId: selectedClass }
    }));
  }, [selectedClass]);

  // Effect to fetch assignments when class or user changes
  useEffect(() => {
    console.log("Assignment fetch effect triggered. Auth loading:", authLoading, "User:", user?.uid, "Selected Class:", selectedClass);

    if (authLoading) {
        console.log("Auth is loading, skipping assignment fetch.");
        return; // Wait for auth to finish loading
    }

    if (!user) {
      console.log("No user logged in, clearing assignments.");
      setAssignments([]);
      setLoadingAssignments(false);
      setAssignmentError(null);
      return;
    }

    if (!selectedClass) {
       console.log("No class selected, clearing assignments.");
       setAssignments([]);
       setLoadingAssignments(false); // Ensure loading stops if no class is selected
       setAssignmentError(null);
       return; // Don't query if no class is selected
    }

    if (!db) {
        console.error("Firestore DB not initialized.");
        setAssignmentError("Database connection failed.");
        setLoadingAssignments(false);
        setAssignments([]);
        return;
    }

    setLoadingAssignments(true);
    setAssignmentError(null);
    console.log(`Fetching assignments for teacher ${user.uid} and class ${selectedClass}`);

    // ** Temporarily Removed orderBy to simplify index requirement **
    const q = query(
      collection(db, 'assignments'),
      where('createdBy', '==', user.uid),
      where('assignedTo.classId', '==', selectedClass)
      // orderBy('createdAt', 'desc') // Temporarily removed
    );

    const unsubscribe = onSnapshot(q, snap => {
      console.log(`Assignment snapshot received: ${snap.size} docs for class ${selectedClass}`);
      const items: Assignment[] = [];
      snap.docs.forEach(d => {
        const data = d.data() as DocumentData;
        let due: Date | null = null;
        // Robust date handling
        if (isTimestamp(data.dueDate)) { // Use type guard
          due = data.dueDate.toDate();
        } else if (typeof data.dueDate === 'string') {
          try { due = new Date(data.dueDate); } catch { due = null; }
        } else if (data.dueDate?.seconds) { // Handle Firestore Timestamp object format
          due = new Timestamp(data.dueDate.seconds, data.dueDate.nanoseconds).toDate();
        } else if (data.dueDate instanceof Date) { // Handle JS Date object
            due = data.dueDate;
        }

        if (due instanceof Date && !isNaN(due.getTime())) { // Check if valid Date object
          items.push({
            id: d.id,
            title: data.title || 'Untitled Assignment',
            description: data.description || '',
            type: data.type || 'Other',
            dueDate: due, // Ensure it's a Date object
            assignedTo: data.assignedTo || { classId: selectedClass, studentIds: [] },
            createdBy: data.createdBy,
            createdAt: data.createdAt, // Keep as Timestamp
            mcqQuestions: data.type === 'MCQ' ? data.mcqQuestions : undefined,
          } as Assignment);
        } else {
           console.warn(`Invalid or missing dueDate for assignment ${d.id}:`, data.dueDate);
        }
      });
       // Sort client-side if orderBy was removed
       items.sort((a, b) => (b.createdAt?.toDate()?.getTime() ?? 0) - (a.createdAt?.toDate()?.getTime() ?? 0));
      console.log(`Processed ${items.length} valid assignments.`);
      setAssignments(items);
      setLoadingAssignments(false);
    }, (error) => {
        console.error(`Error fetching assignments for class ${selectedClass}:`, error);
        setAssignmentError(`Failed to load assignments: ${error.message}`);
        setLoadingAssignments(false);
        setAssignments([]); // Clear on error
        toast({ variant: 'destructive', title: 'Loading Error', description: `Failed to load assignments for ${selectedClass}. ${error.message.includes('index') ? 'Firestore index might be missing or building.' : 'Check console for details.'}` });
    });

    // Cleanup listener
    return () => {
       console.log("Unsubscribing from assignments listener for class:", selectedClass);
       unsubscribe();
    };
  }, [user, selectedClass, authLoading, toast]); // Add authLoading and toast dependencies


  // --- Function to fetch submissions for a selected assignment ---
    const fetchSubmissions = async (assignmentId: string) => {
        if (!assignmentId || !db) {
             console.warn("Cannot fetch submissions: Missing assignment ID or DB connection.");
             return;
        }
        setLoadingSubmissions(true);
        setSubmissions([]); // Clear previous
        console.log(`Fetching submissions for assignment: ${assignmentId}`);
        try {
            const submissionsRef = collection(db, 'assignments', assignmentId, 'submissions');
            const submissionsSnap = await getDocs(submissionsRef);
            const subsData = submissionsSnap.docs.map(doc => {
                const data = doc.data();
                // Basic validation for submission data
                return {
                    id: doc.id, // student UID
                    status: data.status || 'Not Started',
                    submittedAt: isTimestamp(data.submittedAt) ? data.submittedAt : undefined, // Handle timestamp safely
                    answers: Array.isArray(data.answers) ? data.answers : undefined,
                    responseText: typeof data.responseText === 'string' ? data.responseText : undefined,
                    grade: data.grade, // Keep as is (could be number or string like 'N/A')
                    feedback: typeof data.feedback === 'string' ? data.feedback : undefined,
                } as Submission;
            });
            console.log(`Fetched ${subsData.length} submissions for assignment ${assignmentId}`);
            setSubmissions(subsData);
        } catch (error: any) {
            console.error(`Error fetching submissions for assignment ${assignmentId}:`, error);
            toast({ variant: "destructive", title: "Error", description: "Could not load submissions." });
            setSubmissions([]); // Clear on error
        } finally {
            setLoadingSubmissions(false);
        }
    };
  // --- End Function to fetch submissions ---

  const handleViewDetails = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    fetchSubmissions(assignment.id); // Fetch submissions when opening details
  };

  const handleCreate = async () => {
    if (!user || !selectedClass) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please log in and select a class.' });
      return;
    }
    if (!newAssignment.title || !newAssignment.description) {
      toast({ variant: 'destructive', title: 'Error', description: 'Title and Description are required.' });
      return;
    }
    if (newAssignment.type === 'MCQ' && (!newAssignment.mcqQuestions || newAssignment.mcqQuestions.length === 0)) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please generate or add MCQs for an MCQ assignment.' });
      return;
    }
    if (!newDueDate) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a due date.' });
      return;
    }

    setIsSavingAssignment(true);
    try {
      // Ensure assignedTo has the currently selected class
      const finalAssignmentData = {
          ...newAssignment,
          assignedTo: { ...newAssignment.assignedTo, classId: selectedClass },
          dueDate: Timestamp.fromDate(newDueDate), // Convert Date to Firestore Timestamp
          createdBy: user.uid,
          createdAt: serverTimestamp(),
      };

      // Remove mcqQuestions field if type is not MCQ to avoid storing unnecessary data
      if (finalAssignmentData.type !== 'MCQ') {
          delete (finalAssignmentData as any).mcqQuestions;
      }


      await addDoc(collection(db, 'assignments'), finalAssignmentData);
      toast({ title: 'Success', description: 'Assignment created successfully.' });
      setIsCreateOpen(false);
      // Reset form state
      setNewAssignment({
        title: '', description: '', type: 'Written',
        mcqQuestions: [], assignedTo: { classId: selectedClass, studentIds: [] }
      });
      setNewDueDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      setGeneratedMCQs(null);
      setMcqTopic('');
      setMcqCount(5);
    } catch (error: any) {
      console.error("Error creating assignment:", error);
      toast({ variant: 'destructive', title: 'Error', description: `Failed to create assignment: ${error.message}` });
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleGenMCQ = async () => {
    if (!mcqTopic.trim()) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter a topic for MCQs.' });
      return;
    }
    if (!selectedClass) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please select a class first.' });
        return;
    }
    setIsGenMCQ(true);
    setGeneratedMCQs(null); // Clear previous
    try {
      const gradeForAI = selectedClass.toLowerCase().replace(/\s+/g, '-');
      const res: GenerateMCQOutput = await generateMCQ({
        topic: mcqTopic,
        numQuestions: mcqCount,
        grade: gradeForAI, // Pass selected class/grade
      });

      // More robust filtering for valid MCQ structure
      const cleanMCQs: McqQuestion[] = (res?.questions ?? []) // Handle potential null/undefined res or res.questions
        .filter(
          (q): q is McqQuestion => // Type guard to ensure structure
            q &&
            typeof q.question === 'string' && q.question.trim() !== '' &&
            Array.isArray(q.options) && q.options.length > 0 && q.options.every(opt => typeof opt === 'string') &&
            typeof q.correctAnswer === 'string' && q.correctAnswer.trim() !== '' &&
            q.options.includes(q.correctAnswer) // Ensure correct answer is one of the options
        );

      if (cleanMCQs.length === 0) {
        toast({ title: 'Info', description: 'AI could not generate valid MCQs for this topic. Please try again or refine the topic.' });
      } else {
          toast({ title: 'MCQs Generated', description: `${cleanMCQs.length} valid questions created.` });
      }
      setGeneratedMCQs({ questions: cleanMCQs });
      // Update the mcqQuestions in the newAssignment state
      setNewAssignment(a => ({ ...a, mcqQuestions: cleanMCQs, type: 'MCQ' })); // Automatically set type to MCQ
      setMcqCurrentIndex(0); // Reset preview index
    } catch (e: any) {
        console.error("Error generating MCQs:", e);
        toast({ variant: 'destructive', title: 'AI Error', description: e.message || 'Failed to generate MCQs.' });
        setGeneratedMCQs(null); // Clear on error
    } finally {
      setIsGenMCQ(false);
    }
  };



  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle>Teachers Assignment Hub</CardTitle>
          <CardDescription>Create and manage assignments for your class.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
            {/* Class Selector and New Assignment Button */}
             <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
                <div className="flex-grow w-full sm:w-auto">
                    <Label htmlFor="class">Select Class</Label>
                    <Select onValueChange={setSelectedClass} value={selectedClass}> {/* Controlled component */}
                        <SelectTrigger id="class" className="w-full sm:min-w-[200px]">
                            <SelectValue placeholder="Select a class" />
                        </SelectTrigger>
                        <SelectContent>
                            {classes.map((cls) => (
                                <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                 <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto" disabled={!selectedClass}> {/* Disable if no class selected */}
                    <Plus className="mr-2 h-4 w-4" /> New Assignment
                 </Button>
            </div>

          {/* Loading/Error/Empty States */}
          {loadingAssignments && <p className="text-center text-muted-foreground py-4">Loading assignments...</p>}
          {assignmentError && <p className="text-center text-red-500 py-4">{assignmentError}</p>}
          {!loadingAssignments && !assignmentError && assignments.length === 0 && selectedClass && (
            <p className="text-center text-muted-foreground py-4">No assignments found for {selectedClass}.</p>
          )}
          {!loadingAssignments && !assignmentError && assignments.length === 0 && !selectedClass && (
            <p className="text-center text-muted-foreground py-4">Please select a class to view assignments.</p>
          )}


          {/* Assignments Table */}
          {!loadingAssignments && !assignmentError && assignments.length > 0 && (
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
                    <TableCell className="font-medium">{assignment.title}</TableCell>
                    <TableCell><Badge>{assignment.type}</Badge></TableCell>
                    <TableCell>{formatDate(assignment.dueDate)}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(assignment)}>
                        <Eye className="mr-1 h-4 w-4" /> View Details
                      </Button>
                      {/* Add Edit/Delete buttons later if needed */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* View Details Dialog */}
        <Dialog open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
            <DialogContent className="max-w-4xl"> {/* Increased max-width */}
                <DialogHeader>
                    <DialogTitle>{selectedAssignment?.title}</DialogTitle>
                    <DialogDescription>
                        Type: <Badge variant="outline">{selectedAssignment?.type}</Badge> | Due: {formatDate(selectedAssignment?.dueDate)}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2"> {/* Scrollable content */}
                    <p><strong>Description:</strong> {selectedAssignment?.description}</p>

                    {/* Display MCQ Questions if applicable */}
                    {selectedAssignment?.type === 'MCQ' && selectedAssignment.mcqQuestions && (
                        <div className="mt-4 border-t pt-4">
                            <h4 className="text-lg font-semibold mb-2">MCQ Questions</h4>
                            <ScrollArea className="h-[200px] border rounded p-2 bg-muted/10">
                                <ul className="space-y-3">
                                    {selectedAssignment.mcqQuestions.map((q, index) => (
                                        <li key={index} className="text-sm border-b pb-2">
                                            <p><strong>{index + 1}. {q.question}</strong></p>
                                            <ul className="list-disc pl-5 mt-1">
                                                {q.options.map((opt, i) => (
                                                    <li key={i} className={opt === q.correctAnswer ? 'text-green-600 font-medium' : ''}>
                                                        {opt} {opt === q.correctAnswer && '(Correct)'}
                                                    </li>
                                                ))}
                                            </ul>
                                        </li>
                                    ))}
                                </ul>
                             </ScrollArea>
                        </div>
                    )}

                    {/* Display Submissions */}
                    <div className="mt-4 border-t pt-4">
                        <h4 className="text-lg font-semibold mb-2">Submissions</h4>
                        {loadingSubmissions ? <p>Loading submissions...</p> :
                            submissions.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student ID</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Submitted At</TableHead>
                                            <TableHead>Grade</TableHead>
                                            <TableHead>Feedback</TableHead>
                                            {/* Add more headers if needed */}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {submissions.map(sub => (
                                            <TableRow key={sub.id}>
                                                <TableCell className="truncate max-w-[100px]">{sub.id}</TableCell> {/* Show student ID */}
                                                <TableCell>
                                                    <Badge variant={sub.status === 'Submitted' || sub.status === 'Graded' ? 'secondary' : sub.status === 'Overdue' ? 'destructive' : 'outline'}>
                                                       {sub.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>{formatDate(sub.submittedAt)}</TableCell>
                                                <TableCell>{sub.grade ?? 'Not Graded'}</TableCell>
                                                <TableCell className="truncate max-w-[150px]">{sub.feedback ?? '-'}</TableCell>
                                                {/* Add actions like Grade/View Submission here */}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <p className="text-muted-foreground text-sm">No submissions yet.</p>
                            )
                        }
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setSelectedAssignment(null)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      {/* Create New Assignment Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-[700px] grid grid-cols-1 md:grid-cols-2 gap-6 p-8 md:max-h-[90vh] md:overflow-y-auto"> {/* Adjusted for responsiveness & scroll */}
          {/* Left Column: General Info */}
          <div className="space-y-4 flex flex-col">
             <DialogHeader className="mb-4">
                <DialogTitle className="text-2xl font-semibold">Create New Assignment</DialogTitle>
             </DialogHeader>
            <div className="grid gap-2">
              <Label htmlFor="new-title" className="text-sm font-medium">Title</Label>
              <Input
                id="new-title"
                value={newAssignment.title}
                onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                placeholder="e.g., Algebra Worksheet 1"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-base"
              />
            </div>
            <div className="grid gap-2 flex-grow">
              <Label htmlFor="new-desc" className="text-sm font-medium">Description</Label>
              <Textarea
                id="new-desc"
                value={newAssignment.description}
                onChange={e => setNewAssignment({ ...newAssignment, description: e.target.value })}
                placeholder="Instructions for the assignment..."
                rows={5}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-base min-h-[120px] flex-grow"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-type" className="text-sm font-medium">Type</Label>
              <Select
                value={newAssignment.type}
                onValueChange={v => setNewAssignment({ ...newAssignment, type: v as AssignmentType })}
              >
                <SelectTrigger id="new-type" className="w-full p-3 border border-gray-300 rounded-md text-base">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {(['Written', 'MCQ', 'Test', 'Other'] as AssignmentType[]).map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="new-due-date" className="text-sm font-medium">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="new-due-date"
                    variant="outline"
                    className="w-full justify-start text-left font-normal p-3 border border-gray-300 rounded-md text-base"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newDueDate ? format(newDueDate, "PPP p") : <span>Pick a date & time</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={newDueDate}
                    onSelect={setNewDueDate}
                    initialFocus
                  />
                  {/* Simple Time Picker Example (Optional) */}
                   <div className="p-2 border-t">
                      <Input type="time" step="300" // 5-minute steps
                         defaultValue={newDueDate ? format(newDueDate, 'HH:mm') : '09:00'}
                         onChange={(e) => {
                           const time = e.target.value;
                           setNewDueDate(currentDate => {
                               if (!currentDate) return new Date(); // Handle case where date isn't set
                               const [hours, minutes] = time.split(':').map(Number);
                               const newDate = new Date(currentDate);
                               newDate.setHours(hours, minutes, 0, 0);
                               return newDate;
                           });
                         }}
                      />
                   </div>
                </PopoverContent>
              </Popover>
            </div>
             {/* Buttons moved to the bottom of the left column for mobile */}
             <div className="flex justify-end gap-4 mt-auto pt-4 md:hidden">
                 <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                 <Button
                     onClick={handleCreate}
                     disabled={isSavingAssignment}
                     className="bg-primary text-primary-foreground hover:bg-primary/90"
                 >
                     {isSavingAssignment ? 'Creating...' : 'Create Assignment'}
                 </Button>
             </div>
          </div>

          {/* Right Column: MCQ (Conditional) */}
          <div className={`space-y-4 ${newAssignment.type !== 'MCQ' ? 'hidden md:flex md:items-center md:justify-center md:border-l md:pl-6' : 'md:border-l md:pl-6'}`}>
            {newAssignment.type === 'MCQ' ? (
              <>
                <h3 className="text-lg font-semibold">MCQ Generator</h3>
                <div className="grid gap-2">
                  <Label htmlFor="mcq-topic" className="text-sm font-medium">Topic</Label>
                  <Input
                    id="mcq-topic"
                    value={mcqTopic}
                    onChange={e => setMcqTopic(e.target.value)}
                    placeholder="e.g., Photosynthesis"
                    className="w-full p-3 border border-gray-300 rounded-md text-base"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mcq-count" className="text-sm font-medium">Number of Questions</Label>
                  <Input
                    id="mcq-count"
                    type="number"
                    min={1}
                    max={20}
                    value={mcqCount}
                    onChange={e => setMcqCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full p-3 border border-gray-300 rounded-md text-base"
                  />
                </div>
                <Button
                  onClick={handleGenMCQ}
                  disabled={isGenMCQ || !mcqTopic.trim()}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3"
                >
                  {isGenMCQ ? 'Generating...' : 'Generate MCQs'}
                </Button>

                {/* MCQ Preview */}
                {generatedMCQs && generatedMCQs.questions.length > 0 && (
                  <div className="mt-4">
                    <Label className="text-sm font-medium">Preview ({mcqCurrentIndex + 1}/{generatedMCQs.questions.length})</Label>
                    <Card className="p-4 min-h-[200px] border rounded-md bg-muted/50 flex flex-col">
                        <ScrollArea className="flex-grow h-[150px]"> {/* Fixed height for scroll */}
                           <p className="font-medium mb-2">{generatedMCQs.questions[mcqCurrentIndex].question}</p>
                           <ul className="list-disc pl-5 text-sm space-y-1">
                              {generatedMCQs.questions[mcqCurrentIndex].options.map((o, i) => (
                              <li
                                  key={i}
                                  className={o === generatedMCQs.questions[mcqCurrentIndex].correctAnswer ? 'text-green-600 font-semibold' : ''}
                              >
                                  {o} {o === generatedMCQs.questions[mcqCurrentIndex].correctAnswer && '(Correct)'}
                              </li>
                              ))}
                          </ul>
                        </ScrollArea>
                    </Card>
                    <div className="flex justify-between mt-2">
                      <Button
                        variant="outline" size="sm"
                        onClick={() => setMcqCurrentIndex(i => Math.max(i - 1, 0))}
                        disabled={mcqCurrentIndex === 0}
                      >
                        <ArrowLeft className="mr-1 h-4 w-4" /> Prev
                      </Button>
                      <Button
                        variant="outline" size="sm"
                        onClick={() => setMcqCurrentIndex(i => Math.min(i + 1, generatedMCQs.questions.length - 1))}
                        disabled={mcqCurrentIndex === generatedMCQs.questions.length - 1}
                      >
                        Next <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {generatedMCQs && generatedMCQs.questions.length === 0 && !isGenMCQ && (
                  <p className="text-sm text-muted-foreground mt-4">No valid questions generated.</p>
                )}
              </>
            ) : (
               <p className="text-center text-sm text-muted-foreground p-4">Select "MCQ" type to generate questions.</p>
            )}
             {/* Buttons moved to the bottom of the right column for desktop */}
             <div className="hidden md:flex justify-end gap-4 mt-auto pt-4">
                 <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                 <Button
                     onClick={handleCreate}
                     disabled={isSavingAssignment}
                     className="bg-primary text-primary-foreground hover:bg-primary/90"
                 >
                     {isSavingAssignment ? 'Creating...' : 'Create Assignment'}
                 </Button>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
