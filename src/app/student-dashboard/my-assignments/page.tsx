
'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  DocumentData,
  orderBy, // Import orderBy
  onSnapshot, // Import onSnapshot
} from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { format, isPast } from 'date-fns'; // Import isPast for due date check
import { motion } from 'framer-motion'; // For animations
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // For details

type AssignmentType = 'Written' | 'MCQ' | 'Test' | 'Other';

interface McqQuestion {
  question: string;
  options: string[];
  correctAnswer: string; // Assuming correct answer is needed for display later, maybe not for submission
}

interface BaseAssignment {
  id: string;
  title: string;
  description: string;
  dueDate: Timestamp | Date; // Should be consistent from Firestore
  assignedTo: { classId: string; studentIds: string[] };
  createdBy: string; // Teacher UID
  createdAt: Timestamp; // Firestore Timestamp
  type: AssignmentType;
}

interface McqAssignment extends BaseAssignment {
  type: 'MCQ';
  mcqQuestions: McqQuestion[];
}

interface NonMcqAssignment extends BaseAssignment {
  type: Exclude<AssignmentType, 'MCQ'>;
  mcqQuestions?: McqQuestion[]; // Optional here, consistent with base
}

type Assignment = McqAssignment | NonMcqAssignment;

interface Submission {
  status: 'Not Started' | 'Submitted' | 'Overdue' | 'Graded'; // Added Graded status
  submittedAt?: Timestamp | Date;
  answers?: string[]; // For MCQ
  responseText?: string; // For Written/Other
  grade?: number | string; // Can be number (percentage) or letter grade
  feedback?: string; // Teacher feedback
}

// Helper to safely format date
const formatDueDate = (dueDate: Timestamp | Date | null | undefined): string => {
    if (!dueDate) return 'No due date';
    let date: Date | null = null;
    if (dueDate instanceof Timestamp) {
        date = dueDate.toDate();
    } else if (dueDate instanceof Date) {
        date = dueDate;
    } else if (typeof dueDate === 'object' && dueDate !== null && 'seconds' in dueDate && 'nanoseconds' in dueDate) {
        // Handle Firestore Timestamp-like object from server render if necessary
        date = new Timestamp((dueDate as any).seconds, (dueDate as any).nanoseconds).toDate();
    }

    if (date instanceof Date && !isNaN(date.getTime())) {
        return format(date, 'PPP p'); // e.g., Jun 21, 2024, 11:59 PM
    }
    return 'Invalid date';
};

// Helper to determine status badge color
const getStatusBadgeVariant = (status: Submission['status'] | 'Due'): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'Submitted':
    case 'Graded':
      return 'default'; // Blue/Primary
    case 'Overdue':
      return 'destructive'; // Red
    case 'Not Started':
    case 'Due': // Consider 'Due' as secondary for now
      return 'secondary'; // Gray/Secondary
    default:
      return 'outline';
  }
};

const StudentAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({}); // Map assignmentId -> submission
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, userClass, loading: authLoading } = useAuth();
  const [mcqAnswers, setMcqAnswers] = useState<string[]>([]);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Assignments and Submissions in Real-time
  useEffect(() => {
      if (authLoading) {
          setIsLoading(true);
          return;
      }
      if (!user?.uid) {
          setError('Log in to view assignments.');
          setIsLoading(false);
          setAssignments([]); // Clear assignments if not logged in
          setSubmissions({});
          return;
      }
      if (!userClass) {
          setError('Class not defined for this user.');
          setIsLoading(false);
          setAssignments([]); // Clear assignments if class is missing
          setSubmissions({});
          return;
      }

      setIsLoading(true);
      setError(null);
      console.log(`Setting up real-time listeners for class: ${userClass} and user: ${user.uid}`);

      // Query for assignments assigned to the student's class
      const assignmentQuery = query(
          collection(db, 'assignments'),
          where('assignedTo.classId', '==', userClass),
          orderBy('dueDate', 'asc') // Order by due date
      );

      const unsubscribeAssignments = onSnapshot(assignmentQuery, async (assignmentSnap) => {
          const fetchedAssignments: Assignment[] = [];
          const assignmentIds: string[] = []; // Keep track of valid assignment IDs

          assignmentSnap.forEach((docSnap) => {
              const data = docSnap.data() as DocumentData;
              const assignedToStudent = !data.assignedTo.studentIds || data.assignedTo.studentIds.length === 0 || data.assignedTo.studentIds.includes(user.uid);

              if (assignedToStudent) {
                  let dueDate: Date | null = null;
                  if (data.dueDate instanceof Timestamp) dueDate = data.dueDate.toDate();
                  else if (data.dueDate instanceof Date) dueDate = data.dueDate;
                  else if (data.dueDate?.seconds) dueDate = new Timestamp(data.dueDate.seconds, data.dueDate.nanoseconds).toDate();

                  if (dueDate instanceof Date && !isNaN(dueDate.getTime())) {
                      const assignment: Assignment = {
                          id: docSnap.id,
                          title: data.title || 'Untitled',
                          description: data.description || '',
                          type: data.type || 'Other',
                          dueDate: dueDate,
                          assignedTo: data.assignedTo,
                          createdBy: data.createdBy,
                          createdAt: data.createdAt,
                          mcqQuestions: data.type === 'MCQ' ? data.mcqQuestions : undefined,
                      };
                      fetchedAssignments.push(assignment);
                      assignmentIds.push(assignment.id);
                  } else {
                      console.warn(`Skipping assignment ${docSnap.id} due to invalid dueDate`);
                  }
              }
          });

          console.log("Fetched Assignments:", fetchedAssignments);
          setAssignments(fetchedAssignments);
          setIsLoading(false); // Stop loading after assignments are processed

          // Now, fetch/listen for submissions for these assignments
          if (assignmentIds.length > 0 && user?.uid) {
              const newSubmissions: Record<string, Submission> = {};
              // Create listeners for each assignment's submission
              assignmentIds.forEach(id => {
                  const subRef = doc(db, 'assignments', id, 'submissions', user.uid);
                  onSnapshot(subRef, (subSnap) => {
                      if (subSnap.exists()) {
                          newSubmissions[id] = subSnap.data() as Submission;
                      } else {
                          // Ensure entry exists even if not submitted, for status calculation
                          newSubmissions[id] = { status: 'Not Started' };
                      }
                      // Update the submissions state progressively
                      setSubmissions(prev => ({ ...prev, ...newSubmissions }));
                  }, (err) => {
                      console.error(`Error fetching submission for assignment ${id}:`, err);
                      // Optionally handle individual submission fetch errors
                  });
              });
              // Set initial submissions state (might be partially filled)
              setSubmissions(newSubmissions);
          } else {
              setSubmissions({}); // No assignments, no submissions
          }

      }, (err) => {
          console.error("Error fetching assignments:", err);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load assignments.' });
          setError('Failed to load assignments.');
          setIsLoading(false);
          setAssignments([]);
          setSubmissions({});
      });

      // Cleanup listeners on unmount
      return () => {
          console.log("Cleaning up assignments listener");
          unsubscribeAssignments();
          // Note: Individual submission listeners are not explicitly unsubscribed here.
          // This might lead to memory leaks if the component unmounts/remounts frequently
          // before all submission listeners are naturally cleaned up.
          // A more robust solution might involve managing an array of unsubscribe functions.
      };
  }, [user, userClass, authLoading, toast]); // Depend on user, userClass, authLoading

  // Function to get the status of an assignment
  const getAssignmentStatus = (assignmentId: string, dueDate: Timestamp | Date): Submission['status'] | 'Due' => {
    const submission = submissions[assignmentId];
    if (submission?.status === 'Submitted' || submission?.status === 'Graded') {
      return submission.status;
    }
    const now = new Date();
    const due = dueDate instanceof Timestamp ? dueDate.toDate() : dueDate;
    if (isPast(due) && (!submission || submission.status === 'Not Started')) {
      return 'Overdue';
    }
    // If submission exists and is 'Not Started', keep it as 'Not Started'
    if (submission?.status === 'Not Started') {
        return 'Not Started';
    }
    // If no submission exists and not overdue, it's 'Not Started' implicitly before interaction
    // But for display, maybe 'Due' is better if it's not overdue yet.
    return 'Due'; // Default to 'Due' if not submitted or overdue
  };


  // Handle Starting an Assignment
  const handleStartAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    // Reset submission form fields based on assignment type
    setResponseText(submissions[assignment.id]?.responseText || '');
    if (assignment.type === 'MCQ' && assignment.mcqQuestions) {
      setMcqAnswers(submissions[assignment.id]?.answers || Array(assignment.mcqQuestions.length).fill(''));
    } else {
      setMcqAnswers([]);
    }
  };

  // Handle MCQ Answer Change
  const handleAnswerChange = (index: number, value: string) => {
    setMcqAnswers(prev => {
      const newAnswers = [...prev];
      newAnswers[index] = value;
      return newAnswers;
    });
  };

  // Handle Submitting Assignment
  const handleSubmit = async () => {
    if (!selectedAssignment || !user) return;

    setIsSubmitting(true);
    setError(null); // Clear previous errors

    try {
      const submissionRef = doc(db, 'assignments', selectedAssignment.id, 'submissions', user.uid);
      const submissionData: Partial<Submission> = {
         status: 'Submitted',
      };

      // Use server timestamp for submittedAt
       submissionData.submittedAt = serverTimestamp() as Timestamp; // Explicitly cast to Timestamp

      // Add answers or response text based on type
      if (selectedAssignment.type === 'MCQ') {
        if (mcqAnswers.some(a => !a)) { // Basic check for completion
          toast({ variant: 'destructive', title: 'Incomplete', description: 'Please answer all MCQ questions.' });
          setIsSubmitting(false);
          return;
        }
        submissionData.answers = mcqAnswers;
      } else {
        if (!responseText.trim()) {
          toast({ variant: 'destructive', title: 'Incomplete', description: 'Please provide a response.' });
          setIsSubmitting(false);
          return;
        }
        submissionData.responseText = responseText;
      }

      await setDoc(submissionRef, submissionData, { merge: true }); // Merge to update existing or create new

      toast({ title: 'Success', description: 'Assignment submitted successfully!' });
      setSelectedAssignment(null); // Close the detail view
      // No need to manually call fetch, listener will update

    } catch (e: any) {
      console.error("Error submitting assignment:", e);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit assignment.' });
      setError('Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
        <h1 className="text-3xl font-bold mb-6">My Assignments</h1>

        {isLoading && (
            <div className="flex justify-center items-center py-10">
                <span className="loader"></span> {/* Use your loader */}
            </div>
        )}

        {error && <p className="text-red-500 text-center mb-4">{error}</p>}

        {!isLoading && !error && assignments.length === 0 && (
            <p className="text-center text-gray-500">You have no assignments.</p>
        )}

        {!isLoading && !error && assignments.length > 0 && !selectedAssignment && (
             <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
                 {assignments.map((assignment) => {
                    const status = getAssignmentStatus(assignment.id, assignment.dueDate);
                    const submission = submissions[assignment.id]; // Get current submission state
                    const isSubmittedOrGraded = submission?.status === 'Submitted' || submission?.status === 'Graded';

                    return (
                         <Card key={assignment.id} className="shadow-md hover:shadow-lg transition-shadow border border-gray-200 flex flex-col">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                     <CardTitle className="text-lg mb-1">{assignment.title}</CardTitle>
                                     <Badge variant={getStatusBadgeVariant(status)} className="ml-2 whitespace-nowrap">
                                        {status}
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs text-gray-500">
                                    Type: <Badge variant="outline" className="ml-1">{assignment.type}</Badge>
                                </CardDescription>
                                <CardDescription className="text-xs text-gray-500 mt-1">
                                     Due: {formatDueDate(assignment.dueDate)}
                                 </CardDescription>
                                 {/* Display Grade if available */}
                                 {submission?.status === 'Graded' && submission?.grade !== undefined && (
                                     <CardDescription className="text-xs text-green-600 font-medium mt-1">
                                         Grade: {submission.grade}%
                                     </CardDescription>
                                 )}
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-muted-foreground line-clamp-3">{assignment.description}</p>
                            </CardContent>
                            <div className="p-4 pt-0 mt-auto">
                                <Button
                                    onClick={() => handleStartAssignment(assignment)}
                                    className={`w-full text-white ${
                                        isSubmittedOrGraded
                                            ? 'bg-gray-400 hover:bg-gray-500 cursor-not-allowed' // Style for submitted/graded
                                            : 'bg-indigo-600 hover:bg-indigo-700' // Default style
                                    }`}
                                >
                                     {isSubmittedOrGraded ? 'View Submission' : status === 'Not Started' ? 'Start Assignment' : 'Continue Assignment'}
                                </Button>
                            </div>
                        </Card>
                    );
                 })}
            </motion.div>
        )}

        {/* Assignment Detail/Submission View */}
        {selectedAssignment && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Button variant="outline" size="sm" onClick={() => setSelectedAssignment(null)} className="mb-4">
                    ← Back to Assignments
                </Button>
                <Card className="shadow-lg border border-gray-200">
                    <CardHeader>
                        <CardTitle className="text-2xl">{selectedAssignment.title}</CardTitle>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                           <Badge variant={getStatusBadgeVariant(getAssignmentStatus(selectedAssignment.id, selectedAssignment.dueDate))}>
                               {getAssignmentStatus(selectedAssignment.id, selectedAssignment.dueDate)}
                           </Badge>
                           <span>Type: <Badge variant="outline">{selectedAssignment.type}</Badge></span>
                           <span>Due: {formatDueDate(selectedAssignment.dueDate)}</span>
                           {/* Display Grade here too */}
                            {submissions[selectedAssignment.id]?.status === 'Graded' && submissions[selectedAssignment.id]?.grade !== undefined && (
                                 <span className="text-green-600 font-medium">Grade: {submissions[selectedAssignment.id]?.grade}%</span>
                             )}
                        </div>
                         <CardDescription className="pt-2">{selectedAssignment.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                       {/* Display Submission Area or Submitted/Graded Info */}
                        {submissions[selectedAssignment.id]?.status === 'Submitted' || submissions[selectedAssignment.id]?.status === 'Graded' ? (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                                <h3 className="font-semibold text-green-800 mb-2">Submission Details</h3>
                                <p className="text-sm mb-1"><strong>Status:</strong> {submissions[selectedAssignment.id]?.status}</p>
                                {submissions[selectedAssignment.id]?.submittedAt &&
                                    <p className="text-sm mb-1"><strong>Submitted On:</strong> {formatDueDate(submissions[selectedAssignment.id]?.submittedAt)}</p>
                                }
                                {/* Display answers/response */}
                                {selectedAssignment.type === 'MCQ' && submissions[selectedAssignment.id]?.answers && (
                                    <div className="mt-2">
                                        <strong>Your Answers:</strong>
                                        <ul className="list-decimal pl-5 text-sm">
                                            {selectedAssignment.mcqQuestions?.map((q, idx) => (
                                                <li key={idx}> {q.question.substring(0,30)}... : <strong>{submissions[selectedAssignment.id]?.answers?.[idx] || 'N/A'}</strong></li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {selectedAssignment.type !== 'MCQ' && submissions[selectedAssignment.id]?.responseText && (
                                    <p className="text-sm mt-2"><strong>Your Response:</strong> {submissions[selectedAssignment.id]?.responseText}</p>
                                )}
                                {/* Display Grade and Feedback if available */}
                                {submissions[selectedAssignment.id]?.status === 'Graded' && (
                                    <div className="mt-3 border-t pt-3">
                                         <p className="text-sm mb-1"><strong>Grade:</strong> {submissions[selectedAssignment.id]?.grade !== undefined ? `${submissions[selectedAssignment.id]?.grade}%` : 'Not Graded Yet'}</p>
                                         <p className="text-sm"><strong>Feedback:</strong> {submissions[selectedAssignment.id]?.feedback || 'No feedback provided.'}</p>
                                    </div>
                                )}
                                {/* Button to go back if already submitted/graded */}
                                <Button variant="secondary" onClick={() => setSelectedAssignment(null)} className="mt-4">
                                    Back to Assignments
                                </Button>
                            </div>
                        ) : (
                             // Submission Form
                            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
                                {selectedAssignment.type === 'MCQ' && selectedAssignment.mcqQuestions && (
                                    <div className="space-y-4">
                                        <h3 className="font-semibold">Answer the MCQs:</h3>
                                        {selectedAssignment.mcqQuestions.map((q, index) => (
                                            <div key={index} className="p-3 border rounded-md bg-white">
                                                <Label className="font-medium block mb-2">{index + 1}. {q.question}</Label>
                                                <RadioGroup
                                                    value={mcqAnswers[index]}
                                                    onValueChange={(value) => handleAnswerChange(index, value)}
                                                    className="space-y-1"
                                                >
                                                    {q.options.map((opt, optIndex) => (
                                                        <div key={optIndex} className="flex items-center space-x-2">
                                                            <RadioGroupItem value={opt} id={`q${index}-opt${optIndex}`} />
                                                            <Label htmlFor={`q${index}-opt${optIndex}`} className="font-normal">{opt}</Label>
                                                        </div>
                                                    ))}
                                                </RadioGroup>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {selectedAssignment.type !== 'MCQ' && (
                                    <div className="space-y-2">
                                        <Label htmlFor="responseText" className="font-semibold">Your Response:</Label>
                                        <Textarea
                                            id="responseText"
                                            value={responseText}
                                            onChange={(e) => setResponseText(e.target.value)}
                                            rows={8}
                                            placeholder="Type your response here..."
                                            className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                                        />
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        )}
    </>
  );
};

export default StudentAssignmentsPage;


    