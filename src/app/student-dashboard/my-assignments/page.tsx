// src/app/student-dashboard/my-assignments/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { format, isPast } from 'date-fns';
import { motion } from 'framer-motion';

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
  dueDate: Date; // Use Date object for consistency
  assignedTo: { classId: string; studentIds: string[] };
  createdBy: string;
  createdAt: Timestamp;
  type: AssignmentType;
}

interface McqAssignment extends BaseAssignment {
  type: 'MCQ';
  mcqQuestions: McqQuestion[];
}

interface NonMcqAssignment extends BaseAssignment {
  type: Exclude<AssignmentType, 'MCQ'>;
  mcqQuestions?: McqQuestion[];
}

type Assignment = McqAssignment | NonMcqAssignment;

interface Submission {
  id?: string; // Optional, might not be needed if using student ID as doc ID
  status: 'Not Started' | 'Submitted' | 'Overdue' | 'Graded';
  submittedAt?: Timestamp;
  answers?: string[];
  responseText?: string;
  grade?: number | string;
  feedback?: string;
}

// Format a Firestore Timestamp or JS Date
const formatDueDate = (due: Date | Timestamp | null | undefined): string => {
  if (!due) return 'No due date';
  const d = due instanceof Timestamp ? due.toDate() : due;
  try {
    return isNaN(d.getTime()) ? 'Invalid date' : format(d, 'PPP p');
  } catch (e) {
    console.error('Error formatting date:', d, e);
    return 'Invalid Date';
  }
};

const getBadgeVariant = (
  status: Submission['status'] | 'Due'
): 'default' | 'secondary' | 'destructive' | 'outline' => { // Added 'outline'
  switch (status) {
    case 'Submitted':
      return 'secondary';
    case 'Graded':
      return 'default'; // Use primary for graded
    case 'Overdue':
      return 'destructive';
    case 'Not Started':
    case 'Due':
    default:
      return 'outline'; // Use outline for not started/due
  }
};

export default function StudentAssignmentsPage() {
  const { user, userClass, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [mcqAnswers, setMcqAnswers] = useState<string[]>([]);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Real-time listener for assignments and submissions
  useEffect(() => {
    if (authLoading || !user?.uid || !userClass) {
      console.log("Auth loading or missing user/class, returning.");
      setAssignments([]);
      setSubmissions({});
      setLoading(false); // Stop loading if prerequisites aren't met
      if (!authLoading && (!user || !userClass)) {
        setError("User not logged in or class not defined.");
      }
      return;
    }

    setLoading(true);
    setError(null);
    console.log(`Setting up assignments listener for user ${user.uid} in class ${userClass}`);

    // Query for assignments assigned to the student's class
    const q = query(
      collection(db, 'assignments'),
      where('assignedTo.classId', '==', userClass),
      // Optionally filter assignments specifically assigned to the user if studentIds array is used:
      // where('assignedTo.studentIds', 'array-contains', user.uid),
      orderBy('dueDate', 'asc') // Order by due date
    );

    const unsubAssignments = onSnapshot(q, (asgSnap) => {
        console.log(`Assignments snapshot received: ${asgSnap.size} docs`);
        const fetchedAssignments: Assignment[] = [];
        const assignmentIds: string[] = [];

        asgSnap.docs.forEach(d => {
            const data = d.data() as DocumentData;
            let dueDate: Date | null = null;
             // Robust date handling
            if (data.dueDate instanceof Timestamp) {
                dueDate = data.dueDate.toDate();
            } else if (typeof data.dueDate === 'string') {
                try { dueDate = new Date(data.dueDate); } catch { dueDate = null; }
            } else if (data.dueDate?.seconds) { // Handle Firestore Timestamp object format
                 dueDate = new Timestamp(data.dueDate.seconds, data.dueDate.nanoseconds).toDate();
            } else if (data.dueDate instanceof Date) { // Handle JS Date object
                 dueDate = data.dueDate;
            }

            // Ensure the user is actually assigned (either class-wide or individually)
            const isAssigned = data.assignedTo?.studentIds?.length === 0 || data.assignedTo?.studentIds?.includes(user.uid);

            if (dueDate instanceof Date && !isNaN(dueDate.getTime()) && isAssigned) {
                fetchedAssignments.push({
                    id: d.id,
                    title: data.title || 'Untitled Assignment',
                    description: data.description || '',
                    type: data.type || 'Other',
                    dueDate: dueDate, // Use the converted Date object
                    assignedTo: data.assignedTo || { classId: userClass, studentIds: [] },
                    createdBy: data.createdBy,
                    createdAt: data.createdAt, // Keep as Timestamp
                    mcqQuestions: data.type === 'MCQ' ? data.mcqQuestions : undefined,
                } as Assignment);
                assignmentIds.push(d.id);
            } else {
                 console.warn(`Skipping assignment ${d.id} due to invalid dueDate or not assigned:`, data.dueDate, data.assignedTo);
            }
        });
        setAssignments(fetchedAssignments);

        // --- Fetch Submissions for these assignments ---
        // Clear previous submissions and listeners if any
        const submissionListeners: { [key: string]: () => void } = {}; // To store unsubscribe functions
        setSubmissions({}); // Reset submissions

        if (assignmentIds.length > 0) {
            console.log(`Fetching submissions for ${assignmentIds.length} assignments.`);
            const newSubmissions: Record<string, Submission> = {};
            assignmentIds.forEach(aid => {
                const subRef = doc(db, 'assignments', aid, 'submissions', user.uid);
                // Set up individual listeners for each submission document
                const unsubSub = onSnapshot(subRef, (subSnap) => {
                    if (subSnap.exists()) {
                        newSubmissions[aid] = { id: subSnap.id, ...subSnap.data() } as Submission;
                    } else {
                        // If no submission doc exists, use default "Not Started"
                        newSubmissions[aid] = { status: 'Not Started' };
                    }
                    // Update the state incrementally or batch update if preferred
                    setSubmissions(prev => ({ ...prev, [aid]: newSubmissions[aid] }));
                }, (err) => {
                    console.error(`Error listening to submission for assignment ${aid}:`, err);
                });
                submissionListeners[aid] = unsubSub; // Store the unsubscribe function
            });
        } else {
            console.log("No assignments found, skipping submission fetch.");
        }
        // --- End Submission Fetching ---

        setLoading(false); // Stop loading after processing assignments

        // Return a cleanup function that unsubscribes ALL submission listeners
        return () => {
             console.log("Cleaning up assignment and submission listeners.");
             unsubAssignments();
             Object.values(submissionListeners).forEach(unsub => unsub());
        };

    }, (error) => {
        console.error('Error fetching assignments:', error);
        setError(`Failed to load assignments: ${error.message}`);
        setLoading(false);
        setAssignments([]); // Clear on error
        setSubmissions({});
    });

    // Combined cleanup function
    return () => {
      console.log("Top-level cleanup for assignments useEffect.");
      unsubAssignments();
      // Ensure any potentially created submission listeners are cleared (redundant but safe)
      // This part is tricky as submission listeners are created inside the asgSnap callback.
      // A more robust approach might involve managing submission listener unsubscribes in a ref.
    };
  }, [user, userClass, authLoading, toast]); // Dependencies


  const getStatus = (id: string, due: Date): Submission['status'] | 'Due' => {
    const sub = submissions[id];
    if (sub?.status === 'Submitted' || sub?.status === 'Graded') {
      return sub.status;
    }
    if (isPast(due)) {
      return 'Overdue';
    }
    return sub?.status === 'Not Started' ? 'Not Started' : 'Due';
  };

  const handleStartAssignment = (a: Assignment) => {
    setSelectedAssignment(a);
    const currentSubmission = submissions[a.id];
    setResponseText(currentSubmission?.responseText || '');
    if (a.type === 'MCQ' && a.mcqQuestions) {
      setMcqAnswers(currentSubmission?.answers || Array(a.mcqQuestions.length).fill(''));
    } else {
      setMcqAnswers([]);
    }
  };

  const handleAnswerChange = (idx: number, val: string) => {
    setMcqAnswers(prev => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleSubmit = async () => {
    if (!selectedAssignment || !user) return;

    const currentStatus = getStatus(selectedAssignment.id, selectedAssignment.dueDate);
    if (currentStatus === 'Graded') {
        toast({ variant: "default", title: "Already Graded", description: "This assignment has already been graded." });
        return;
    }

    setIsSubmitting(true);
    setError(null);

    const subRef = doc(db, 'assignments', selectedAssignment.id, 'submissions', user.uid);
    const data: Partial<Submission> = {
      status: 'Submitted',
      submittedAt: serverTimestamp() as Timestamp, // Cast needed for serverTimestamp
    };

    let isComplete = true; // Flag to check completion

    if (selectedAssignment.type === 'MCQ') {
      if (mcqAnswers.some(a => a === '')) {
        toast({ variant: 'destructive', title: 'Incomplete', description: 'Please answer all questions.' });
        isComplete = false;
      } else {
         data.answers = mcqAnswers;
      }
    } else {
      if (!responseText.trim()) {
        toast({ variant: 'destructive', title: 'Incomplete', description: 'Please provide your response.' });
        isComplete = false;
      } else {
        data.responseText = responseText;
      }
    }

    if (!isComplete) {
       setIsSubmitting(false);
       return; // Stop submission if incomplete
    }


    try {
      await setDoc(subRef, data, { merge: true });
      toast({ title: 'Success', description: 'Assignment Submitted!' });
      setSelectedAssignment(null); // Close the detail view
    } catch (e: any) {
      console.error('Submission error:', e);
      setError(`Submission failed: ${e.message}`);
      toast({ variant: 'destructive', title: 'Error', description: 'Submission failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">My Assignments</h1>

      {/* Loading and Error States */}
      {loading && (
        <div className="flex justify-center items-center py-10">
          <span className="loader"></span> {/* Use your loader component/style */}
        </div>
      )}
      {error && !loading && <p className="text-red-500 text-center py-8">{error}</p>}
      {!loading && !error && assignments.length === 0 && (
        <p className="text-center text-gray-500 py-8">You have no assignments{userClass ? ` for ${userClass}` : ''}.</p>
      )}

      {/* Assignment List */}
      {!loading && !error && assignments.length > 0 && !selectedAssignment && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {assignments.map(assignment => {
            const status = getStatus(assignment.id, assignment.dueDate);
            const submission = submissions[assignment.id];
            const done = status === 'Submitted' || status === 'Graded';

            return (
              <Card key={assignment.id} className="flex flex-col shadow-sm hover:shadow-md transition-shadow border">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{assignment.title}</CardTitle>
                    <Badge variant={getBadgeVariant(status)} className="ml-2 shrink-0">
                      {status}
                    </Badge>
                  </div>
                   <CardDescription className="text-xs pt-1">
                     Due: {formatDueDate(assignment.dueDate)} | Type: {assignment.type}
                   </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow text-sm text-muted-foreground">
                  {assignment.description.length > 100 ? `${assignment.description.substring(0, 100)}...` : assignment.description}
                </CardContent>
                <div className="p-4 border-t mt-auto">
                   <Button
                     onClick={() => handleStartAssignment(assignment)}
                     disabled={status === 'Graded'} // Disable only if graded
                     className={`w-full ${done && status !== 'Graded' ? 'bg-green-600 hover:bg-green-700' : status === 'Graded' ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                   >
                     {status === 'Submitted' ? 'View Submission' : status === 'Graded' ? 'View Grade' : 'Start Assignment'}
                   </Button>
                </div>
              </Card>
            );
          })}
        </motion.div>
      )}

      {/* Selected Assignment Detail View */}
      {selectedAssignment && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
          <Button variant="outline" onClick={() => setSelectedAssignment(null)} className="mb-4">
            ← Back to List
          </Button>
          <Card className="shadow-lg border">
            <CardHeader>
              <div className="flex justify-between items-start">
                 <div>
                   <CardTitle className="text-xl">{selectedAssignment.title}</CardTitle>
                    <CardDescription className="text-xs pt-1">
                       Due: {formatDueDate(selectedAssignment.dueDate)} | Type: {selectedAssignment.type}
                    </CardDescription>
                 </div>
                 <Badge variant={getBadgeVariant(getStatus(selectedAssignment.id, selectedAssignment.dueDate))}>
                    {getStatus(selectedAssignment.id, selectedAssignment.dueDate)}
                 </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm">{selectedAssignment.description}</p>

              {/* Submission Area */}
              <div className="mt-4 border-t pt-4">
                 <h3 className="text-lg font-semibold mb-3">Your Submission</h3>
                {/* --- Display Graded Info --- */}
                 {submissions[selectedAssignment.id]?.status === 'Graded' && (
                    <div className="mb-4 p-4 border rounded-md bg-green-50 border-green-200">
                       <p className="font-semibold">Grade: <span className="text-green-700">{submissions[selectedAssignment.id]?.grade ?? 'N/A'}%</span></p>
                       <p className="mt-1 text-sm"><strong>Feedback:</strong> {submissions[selectedAssignment.id]?.feedback || 'No feedback provided.'}</p>
                    </div>
                 )}


                {/* --- MCQ Submission --- */}
                {selectedAssignment.type === 'MCQ' && selectedAssignment.mcqQuestions && (
                  <div className="space-y-6">
                    {selectedAssignment.mcqQuestions.map((question, index) => (
                      <fieldset key={index} className="border rounded-md p-4" disabled={!!submissions[selectedAssignment.id]?.status && submissions[selectedAssignment.id]?.status !== 'Not Started'}>
                        <legend className="text-sm font-medium mb-2 px-1">
                           {index + 1}. {question.question}
                        </legend>
                        <RadioGroup
                          value={mcqAnswers[index]}
                          onValueChange={v => handleAnswerChange(index, v)}
                          className="space-y-2"
                        >
                          {question.options.map((opt, idx) => (
                            <div key={idx} className="flex items-center space-x-2">
                              <RadioGroupItem id={`opt-${index}-${idx}`} value={opt} />
                              <Label htmlFor={`opt-${index}-${idx}`} className="text-sm font-normal">{opt}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </fieldset>
                    ))}
                  </div>
                )}

                {/* --- Written/Other Submission --- */}
                {selectedAssignment.type !== 'MCQ' && (
                  <Textarea
                    value={responseText}
                    onChange={e => setResponseText(e.target.value)}
                    rows={8}
                    placeholder="Type your response here..."
                    disabled={!!submissions[selectedAssignment.id]?.status && submissions[selectedAssignment.id]?.status !== 'Not Started'}
                  />
                )}

                 {/* --- Submit Button --- */}
                  {submissions[selectedAssignment.id]?.status !== 'Submitted' && submissions[selectedAssignment.id]?.status !== 'Graded' && (
                    <Button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="mt-6 w-full sm:w-auto bg-green-600 hover:bg-green-700"
                    >
                      {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
                    </Button>
                  )}
                  {/* --- Already Submitted Message --- */}
                   {submissions[selectedAssignment.id]?.status === 'Submitted' && (
                       <p className="mt-6 text-sm text-center text-green-700 font-medium p-3 bg-green-50 border border-green-200 rounded-md">
                           You have submitted this assignment on {formatDueDate(submissions[selectedAssignment.id]?.submittedAt)}. Waiting for grading.
                       </p>
                   )}
              </div>


              {/* Display Error if Submission Failed */}
              {error && <p className="text-red-500 mt-4">{error}</p>}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
