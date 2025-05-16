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
import { db, GradeData } from '@/lib/firebase'; // Import GradeData type
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
  getDoc, // Added getDoc
} from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { format, isPast } from 'date-fns';
import { motion } from 'framer-motion';
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
  status: 'Not Started' | 'Submitted' | 'Overdue' | 'Graded';
  submittedAt?: Timestamp;
  answers?: string[];
  responseText?: string;
  grade?: number | string;
  feedback?: string;
}

<<<<<<< HEAD
// Format a Firestore Timestamp or JS Date
const formatDueDate = (due: Date | Timestamp | null | undefined): string => {
    if (!due) return 'No due date';
    const d = isTimestamp(due) ? due.toDate() : due; // Use type guard
    return d instanceof Date && !isNaN(d.getTime())
        ? format(d, 'PPP p')
        : 'Invalid date';
=======
const StudentAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const { toast } = useToast();
  const { user, userClass } = useAuth();
  const [mcqAnswers, setMcqAnswers] = useState<string[]>([]);
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    const fetchAssignments = async () => {
      if (user?.uid) {
        const q = query(
          collection(db, 'assignments'),
          where('assignedTo.classId', '==', userClass)
        );
        const querySnapshot = await getDocs(q);
        const assignmentsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
            dueDate: doc.data().dueDate ? (doc.data().dueDate instanceof Date ? doc.data().dueDate : doc.data().dueDate.toDate()) : null,
        })) as Assignment[];
        setAssignments(assignmentsData);
      }
    };

    fetchAssignments();
  }, [user, userClass]);

  const handleStartAssignment = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    const submissionRef = doc(
      db,
      'assignments',
      assignment.id,
      'submissions',
      user!.uid
    );
    const submissionSnap = await getDoc(submissionRef);
    setSubmission(submissionSnap.data() as Submission);
    setMcqAnswers([]);
    setResponseText('');
  };

  const handleMcqAnswerChange = (questionIndex: number, answer: string) => {
    const newAnswers = [...mcqAnswers];
    newAnswers[questionIndex] = answer;
    setMcqAnswers(newAnswers);
  };

  const handleSubmitMcq = async () => {
    if (!selectedAssignment) return;
    const submissionRef = doc(
      db,
      'assignments',
      selectedAssignment.id,
      'submissions',
      user!.uid
    );
      const submissionData: Submission = {
          status: 'Submitted',
          submittedAt: serverTimestamp(),
      };
      if (selectedAssignment.type === 'MCQ') {
          submissionData.answers = mcqAnswers;
      } else {
          submissionData.responseText = responseText;
      }

      await setDoc(submissionRef, submissionData);
    setSubmission({ status: 'Submitted', submittedAt: serverTimestamp(), answers: mcqAnswers });
    setSelectedAssignment(null);
    toast({ title: 'Success', description: 'MCQ submitted successfully.' });
  };

  const handleSubmitResponse = async () => {
    if (!selectedAssignment) return;
    const submissionRef = doc(
      db,
      'assignments',
      selectedAssignment.id,
      'submissions',
      user!.uid
    );
    await setDoc(submissionRef, {
      status: 'Submitted',
      submittedAt: serverTimestamp(),
      responseText,
    });
    setSubmission({ status: 'Submitted', submittedAt: serverTimestamp(), responseText: responseText });
    setSelectedAssignment(null);
    toast({ title: 'Success', description: 'Response submitted successfully.' });
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>My Assignments</CardTitle>
          <CardDescription>List of assignments for your class.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {selectedAssignment ? (
            <>
              <h3 className="text-lg font-semibold">{selectedAssignment.title}</h3>
              <p>{selectedAssignment.description}</p>
              <Badge>{selectedAssignment.type}</Badge>
              <p>Due: {selectedAssignment.dueDate ? (selectedAssignment.dueDate instanceof Date ? selectedAssignment.dueDate.toLocaleString() : (selectedAssignment.dueDate.toDate ? selectedAssignment.dueDate.toDate().toLocaleString() : 'No due date')) : 'No due date'}</p>
              {selectedAssignment.type === 'MCQ' &&
                selectedAssignment.mcqQuestions &&
                selectedAssignment.mcqQuestions.map((question, index) => (
                  <div key={index} className="mb-4">
                    <p className="font-medium">{question.question}</p>
                    {question.options.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id={`${question.question}-${option}`}
                          name={`question-${index}`}
                          value={option}
                          checked={mcqAnswers[index] === option}
                          onChange={() => handleMcqAnswerChange(index, option)}
                        />
                        <label htmlFor={`${question.question}-${option}`}>{option}</label>
                      </div>
                    ))}
                  </div>
                ))}
                {selectedAssignment.type !== 'MCQ' && (
                  <div className="grid gap-2">
                    <Textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Your response here"
                    />
                    <Input placeholder="Link" />
                  </div>
                )}
              {selectedAssignment.type === 'MCQ' ? (
                <Button onClick={handleSubmitMcq}>Submit MCQ</Button>
              ) : (
                <Button onClick={handleSubmitResponse}>Submit Response</Button>
              )}
              {submission?.status === "Submitted" ? <Badge>Submitted</Badge> : null}
            </>
          ) : (
            <div className='grid gap-4'>
            {assignments.map((assignment) => (
              <Card key={assignment.id} className="border">
                <CardHeader>
                  <CardTitle>{assignment.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge>{assignment.type}</Badge>
                  <p>Due: {assignment.dueDate ? (assignment.dueDate instanceof Date ? assignment.dueDate.toLocaleString() : (assignment.dueDate.toDate ? assignment.dueDate.toDate().toLocaleString() : 'No due date')) : 'No due date'}</p>
                  <Button onClick={() => handleStartAssignment(assignment)} disabled={submission?.status === "Submitted"}>
                      {submission?.status === "Submitted" ? "Continue" : "Start"}
                    </Button>
                </CardContent>
              </Card>
            ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
>>>>>>> c17676f7c758b8669ac1d7bed21c2929065b063e
};

// Map status to a Badge variant
const getBadgeVariant = (
  status: Submission['status'] | 'Due'
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'Submitted':
      return 'secondary';
    case 'Graded':
      return 'default';
    case 'Overdue':
      return 'destructive';
    case 'Not Started':
    case 'Due':
    default:
      return 'outline';
  }
};


export default function StudentAssignmentsPage() {
  const { user, userClass, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(
    null
  );
  const [mcqAnswers, setMcqAnswers] = useState<string[]>([]);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep track of submission‐doc listeners so we can clean them up
  const submissionUnsubs = useRef<(() => void)[]>([]);

  // 1. Real‑time listener for assignments
  useEffect(() => {
    // Wait for auth and ensure user/class exist
    if (authLoading) return;

    if (!user?.uid || !userClass) {
      setError('Log in and ensure your class is set.');
      setAssignments([]);
      setSubmissions({});
      setLoading(false);
      console.warn("Assignments fetch skipped: User or userClass missing.", { uid: user?.uid, userClass });
      return;
    }

    setError(null);
    setLoading(true);
    console.log(`Listening for assignments in class ${userClass}`);

    const q = query(
      collection(db, 'assignments'),
      where('assignedTo.classId', '==', userClass)
      // No longer ordering by dueDate here, will sort client-side if needed
      // orderBy('dueDate', 'asc') // Firestore requires composite index for this + classId filter
    );

    const unsub = onSnapshot(
      q,
      snap => {
        console.log(`Assignment snapshot received: ${snap.size} docs for class ${userClass}`);
        const fetched: Assignment[] = [];
        snap.docs.forEach(d => {
          const data = d.data() as DocumentData;
          // Check if assignment is for this student
          const assignedToAll = !data.assignedTo.studentIds || data.assignedTo.studentIds.length === 0;
          const assignedToMe = data.assignedTo.studentIds?.includes(user.uid);

          if (assignedToAll || assignedToMe) {
              let due: Date | null = null;
              if (data.dueDate instanceof Timestamp) due = data.dueDate.toDate();
              else if (typeof data.dueDate === 'string') try { due = new Date(data.dueDate); } catch (e) { console.warn(`Invalid date string for ${d.id}: ${data.dueDate}`); }
              else if (data.dueDate?.seconds) {
                  due = new Timestamp(data.dueDate.seconds, data.dueDate.nanoseconds).toDate();
              } else if (data.dueDate instanceof Date) {
                  due = data.dueDate;
              }

              if (due instanceof Date && !isNaN(due.getTime())) {
                 fetched.push({
                   id: d.id,
                   title: data.title || 'Untitled',
                   description: data.description || '',
                   type: data.type || 'Other',
                   dueDate: due, // Use the converted Date object
                   assignedTo: data.assignedTo || { classId: userClass, studentIds: [] },
                   createdBy: data.createdBy,
                   createdAt: data.createdAt,
                   mcqQuestions: data.type === 'MCQ' ? data.mcqQuestions : undefined,
                 } as Assignment);
              } else {
                 console.warn(`Skipping assignment ${d.id} due to invalid dueDate:`, data.dueDate);
              }
          } else {
            // console.log(`Skipping assignment ${d.id}, not assigned to user ${user.uid}`);
          }
        });
        // Sort fetched assignments by due date client-side
        fetched.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
        setAssignments(fetched);
        setLoading(false);
      },
      err => {
        console.error('Assignments listener failed:', err);
        setError(`Failed to load assignments: ${err.message}`);
        setLoading(false);
      }
    );

    return () => {
        console.log("Cleaning up assignments listener");
        unsub();
    };
  }, [user, userClass, authLoading]); // Depend on authLoading

    // 2. Real‑time listeners for each assignment’s submission doc
    useEffect(() => {
        // Tear down old listeners
        submissionUnsubs.current.forEach(u => u());
        submissionUnsubs.current = [];
        setSubmissions({}); // Reset submissions when assignments change

        if (!user?.uid || !assignments.length) return;

        console.log(`Setting up submission listeners for ${assignments.length} assignments for user ${user.uid}`);

        assignments.forEach(a => {
        const ref = doc(db, 'assignments', a.id, 'submissions', user.uid);
        const unsub = onSnapshot(
            ref,
            snap => {
                console.log(`Submission snapshot for assignment ${a.id} - exists: ${snap.exists()}`);
                setSubmissions(prev => ({
                    ...prev,
                    [a.id]: snap.exists()
                    ? (snap.data() as Submission)
                    : { status: 'Not Started' }, // Explicitly set Not Started if no doc
                }));
            },
            err => {
                console.error(`Submission listener for ${a.id} failed:`, err);
                // Optional: Set an error state for this specific submission
            }
        );
        submissionUnsubs.current.push(unsub);
        });

        // Cleanup function
        return () => {
            console.log("Cleaning up all submission listeners");
            submissionUnsubs.current.forEach(u => u());
            submissionUnsubs.current = [];
        };
    }, [assignments, user]); // Depend on assignments list and user

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


  const handleStartAssignment = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    const submission = submissions[assignment.id];
    setResponseText(submission?.responseText || '');
    if (assignment.type === 'MCQ' && assignment.mcqQuestions) {
      setMcqAnswers(submission?.answers || Array(assignment.mcqQuestions.length).fill(''));
    } else {
      setMcqAnswers([]);
    }
  };

  const handleMcqAnswerChange = (questionIndex: number, value: string) => {
    setMcqAnswers((prevAnswers) => {
      const newAnswers = [...prevAnswers];
      newAnswers[questionIndex] = value;
      return newAnswers;
    });
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No assignment selected or user not logged in.',
      });
      return;
    }
    setIsSubmitting(true);

    const subRef = doc(
      db,
      'assignments',
      selectedAssignment.id,
      'submissions',
      user.uid
    );
    const payload: Partial<Submission> = {
      status: 'Submitted',
      submittedAt: serverTimestamp() as Timestamp, // Use serverTimestamp
    };

    // Validate
    if (selectedAssignment.type === 'MCQ') {
      if (mcqAnswers.some(a => !a)) {
        toast({
          variant: 'destructive',
          title: 'Incomplete',
          description: 'Please answer all MCQ questions.',
        });
        setIsSubmitting(false);
        return;
      }
      payload.answers = mcqAnswers;
    } else {
      if (!responseText.trim()) {
        toast({
          variant: 'destructive',
          title: 'Incomplete',
          description: 'Please provide a response.',
        });
        setIsSubmitting(false);
        return;
      }
      payload.responseText = responseText;
    }

    try {
      await setDoc(subRef, payload, { merge: true });
      toast({ title: 'Success', description: 'Assignment submitted!' });
      setSelectedAssignment(null); // Close the details view
    } catch (e: any) {
      console.error('Submission error', e);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Submission failed: ${e.message}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };


 return (
    // Removed main container div as it's handled by layout
    <>
      <h1 className="text-3xl font-bold mb-6">My Assignments</h1>

      {loading && <div className="text-center py-4">Loading assignments...</div>}
      {error && <div className="text-red-500 text-center py-4">{error}</div>}

      {!loading && !error && !selectedAssignment && assignments.length === 0 && (
        <p className="text-center text-muted-foreground py-8">You have no assignments assigned.</p>
      )}

      {!loading && !error && !selectedAssignment && assignments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map(assignment => {
            const status = getStatus(assignment.id, assignment.dueDate);
            const submission = submissions[assignment.id];
            const isDone = status === 'Submitted' || status === 'Graded';
            const isOverdue = status === 'Overdue';

            return (
                <Card key={assignment.id} className={`flex flex-col shadow hover:shadow-md transition-shadow border ${isOverdue ? 'border-destructive' : 'border-gray-200'}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{assignment.title}</CardTitle>
                    <Badge variant={getBadgeVariant(status)}>{status}</Badge>
                  </div>
                  <CardDescription className="text-xs">
                     Due: {formatDueDate(assignment.dueDate)}
                     {submission?.grade && ` | Grade: ${submission.grade}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow text-sm text-muted-foreground">
                   {assignment.description.length > 100 ? `${assignment.description.slice(0, 100)}...` : assignment.description}
                </CardContent>
                <div className="p-4 border-t mt-auto">
                     <Button
                        onClick={() => handleStartAssignment(assignment)}
                        disabled={status === 'Graded'} // Allow viewing submitted, disable only if graded
                        className={`w-full ${
                        status === 'Graded'
                            ? 'bg-gray-400 cursor-not-allowed'
                            : status === 'Submitted'
                            ? 'bg-blue-600 hover:bg-blue-700' // Different color for submitted but not graded
                            : 'bg-indigo-600 hover:bg-indigo-700' // Default start color
                        }`}
                     >
                       {status === 'Graded' ? 'View Graded' : status === 'Submitted' ? 'View Submission' : 'Start Assignment'}
                     </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

       {/* Assignment Details/Submission View */}
       {selectedAssignment && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
          <Button variant="outline" onClick={() => setSelectedAssignment(null)} className="mb-4">
            ← Back to Assignments
          </Button>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle>{selectedAssignment.title}</CardTitle>
                 <Badge variant={getBadgeVariant(getStatus(selectedAssignment.id, selectedAssignment.dueDate))}>
                    {getStatus(selectedAssignment.id, selectedAssignment.dueDate)}
                </Badge>
              </div>
              <CardDescription>
                 Due: {formatDueDate(selectedAssignment.dueDate)}
                 {submissions[selectedAssignment.id]?.grade && ` | Grade: ${submissions[selectedAssignment.id]?.grade}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-muted-foreground">{selectedAssignment.description}</p>

               {/* Display Grade and Feedback if Graded */}
               {submissions[selectedAssignment.id]?.status === 'Graded' && (
                 <div className="mb-6 p-4 border rounded-md bg-green-50 border-green-200">
                    <h4 className="font-semibold text-green-800 mb-1">Grade & Feedback</h4>
                    <p className="text-lg font-bold text-green-700">Grade: {submissions[selectedAssignment.id]?.grade ?? 'N/A'}</p>
                    <p className="text-sm mt-1"><strong>Feedback:</strong> {submissions[selectedAssignment.id]?.feedback || 'No feedback provided.'}</p>
                 </div>
               )}

               {/* Submission Form */}
               {submissions[selectedAssignment.id]?.status !== 'Graded' && (
                  <form onSubmit={(e) => { e.preventDefault(); handleSubmitAssignment(); }}>
                      {selectedAssignment.type === 'MCQ' &&
                        selectedAssignment.mcqQuestions && (
                        <div className="space-y-6">
                          {selectedAssignment.mcqQuestions.map((question, index) => (
                            <fieldset key={index} className="border p-4 rounded-md">
                              <legend className="font-medium mb-2">
                                {index + 1}. {question.question}
                              </legend>
                              <RadioGroup
                                value={mcqAnswers[index]}
                                onValueChange={(value) =>
                                  handleMcqAnswerChange(index, value)
                                }
                                className="space-y-2"
                                disabled={submissions[selectedAssignment.id]?.status === 'Submitted'} // Disable if already submitted
                              >
                                {question.options.map((option, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center space-x-2"
                                  >
                                    <RadioGroupItem
                                      id={`q${index}-opt${idx}`}
                                      value={option}
                                    />
                                    <Label htmlFor={`q${index}-opt${idx}`}>
                                      {option}
                                    </Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            </fieldset>
                          ))}
                        </div>
                      )}

                      {selectedAssignment.type !== 'MCQ' && (
                        <div className="space-y-2">
                           <Label htmlFor="responseText">Your Response</Label>
                           <Textarea
                              id="responseText"
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              rows={8}
                              placeholder="Type your response here..."
                              disabled={submissions[selectedAssignment.id]?.status === 'Submitted'} // Disable if already submitted
                           />
                           {/* Display previously submitted response if viewing */}
                            {submissions[selectedAssignment.id]?.status === 'Submitted' && submissions[selectedAssignment.id]?.responseText && (
                               <div className="mt-4 p-3 border rounded bg-muted text-sm">
                                  <p className="font-medium mb-1">Your Submission:</p>
                                  <p className="whitespace-pre-wrap">{submissions[selectedAssignment.id]?.responseText}</p>
                               </div>
                            )}
                        </div>
                      )}

                     {/* Submit Button - Hide if graded or already submitted */}
                     {submissions[selectedAssignment.id]?.status !== 'Submitted' && submissions[selectedAssignment.id]?.status !== 'Graded' && (
                        <Button
                            type="submit" // Changed to type="submit"
                            disabled={isSubmitting}
                            className="mt-6 bg-green-600 hover:bg-green-700"
                        >
                            {isSubmitting ? 'Submitting…' : 'Submit Assignment'}
                        </Button>
                     )}
                  </form>
               )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </>
  );
}
