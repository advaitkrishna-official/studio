'use client';

import React, {useState, useEffect, useCallback} from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {useToast} from '@/hooks/use-toast';
import {db} from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  Timestamp,
  DocumentData,
} from 'firebase/firestore';
import {useAuth} from '@/components/auth-provider';
import {Badge} from '@/components/ui/badge';
import {Textarea} from '@/components/ui/textarea';
import {Input} from '@/components/ui/input';
import {RadioGroup, RadioGroupItem} from '@/components/ui/radio-group';
import {Label} from '@/components/ui/label';
import {format} from 'date-fns';

type AssignmentType = 'Written' | 'MCQ' | 'Test' | 'Other';

interface BaseAssignment {
  id: string;
  title: string;
  description: string;
  dueDate: Timestamp | Date | null; // Allow Date type for local state consistency
  assignedTo: {
    classId: string;
    studentIds: string[];
  };
  createdBy: string;
  createdAt: Timestamp;
}

interface McqQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
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
  status: 'Not Started' | 'Submitted' | 'Overdue';
  submittedAt?: Timestamp | Date; // Allow Date type for local state consistency
  answers?: string[]; // For MCQ
  responseText?: string; // For written/other
  grade?: string;
  feedback?: string;
}

const StudentAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {toast} = useToast();
  const {user, userClass, loading: authLoading} = useAuth(); // Get authLoading state
  const [mcqAnswers, setMcqAnswers] = useState<string[]>([]);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAssignmentsAndSubmissions = useCallback(async () => {
    // Wait for auth to finish loading and check for user/class
    if (authLoading) {
      setIsLoading(true); // Keep loading state while auth is resolving
      return;
    }
    if (!user?.uid) {
      setError('User not logged in.'); // Set error if user is not logged in
      setIsLoading(false);
      return;
    }
     if (!userClass) {
       setError('Class not defined for user.'); // Specific error if class is missing
       setIsLoading(false);
       return;
     }

    setIsLoading(true);
    setError(null); // Reset error on new fetch attempt

    try {
      // Query for assignments assigned to the student's class
      const assignmentsQuery = query(
        collection(db, 'assignments'),
        where('assignedTo.classId', '==', userClass)
        // Add orderBy('dueDate', 'asc') if needed
      );
      const assignmentsSnapshot = await getDocs(assignmentsQuery);

      const assignmentsData: Assignment[] = [];
      const submissionPromises = [];

      for (const docSnap of assignmentsSnapshot.docs) {
        const data = docSnap.data() as DocumentData;
        let dueDate = null;
        if (data.dueDate) {
          // Handle both Firestore Timestamp and JS Date (from previous submissions)
          dueDate = data.dueDate instanceof Timestamp ? data.dueDate.toDate() : (data.dueDate instanceof Date ? data.dueDate : (typeof data.dueDate === 'string' ? new Date(data.dueDate) : null));
        }


        const assignment: Assignment = {
          id: docSnap.id,
          title: data.title,
          description: data.description,
          type: data.type,
          dueDate: dueDate,
          assignedTo: data.assignedTo,
          createdBy: data.createdBy,
          createdAt: data.createdAt,
          mcqQuestions: data.type === 'MCQ' ? data.mcqQuestions : undefined,
        } as Assignment;

        // Check if assignment is assigned to this specific student (if studentIds exist)
        // Note: If assignedTo.studentIds is empty or null, it implies assignment to the whole class
        const isAssigned = !assignment.assignedTo?.studentIds?.length ||
                           assignment.assignedTo.studentIds.includes(user.uid);

        if (isAssigned) {
          assignmentsData.push(assignment);
          // Prepare to fetch submission status for this assignment
          const submissionRef = doc(db, 'assignments', assignment.id, 'submissions', user.uid);
          submissionPromises.push(getDoc(submissionRef).then(subSnap => ({assignmentId: assignment.id, submissionData: subSnap.data() as Submission | undefined})));
        }
      }

      // Fetch all submissions in parallel
      const submissionResults = await Promise.all(submissionPromises);
      const submissionsMap = new Map<string, Submission>();
      submissionResults.forEach(result => {
        if (result.submissionData) {
          submissionsMap.set(result.assignmentId, result.submissionData);
        }
      });

      // Filter assignments to show only those not yet submitted
      const filteredAssignments = assignmentsData.filter(a => {
         const sub = submissionsMap.get(a.id);
         return !sub || sub.status !== 'Submitted';
      });

      // Sort assignments by due date (ascending, nulls last)
      filteredAssignments.sort((a, b) => {
        const dateA = a.dueDate instanceof Date ? a.dueDate.getTime() : Infinity;
        const dateB = b.dueDate instanceof Date ? b.dueDate.getTime() : Infinity;
        return dateA - dateB;
      });


      setAssignments(filteredAssignments);

    } catch (e: any) {
      console.error('Error fetching assignments:', e);
      setError('Failed to load assignments. Please try again.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch assignments.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, userClass, toast, authLoading]); // Add authLoading dependency

  useEffect(() => {
    fetchAssignmentsAndSubmissions();
  }, [fetchAssignmentsAndSubmissions]); // Depend on the memoized fetch function


  const handleStartAssignment = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    // Reset previous submission state
    setSubmission(null);
    setMcqAnswers(Array(assignment.type === 'MCQ' && assignment.mcqQuestions ? assignment.mcqQuestions.length : 0).fill(''));
    setResponseText('');

    // Check if there's an existing submission to load (e.g., if they started but didn't finish)
    // This part can be enhanced if saving progress is needed.
    // For now, we just fetch the final submission status if it exists.
    if (!user?.uid) {
        setError("User not found");
        return;
    }
    try {
      const submissionRef = doc(db, 'assignments', assignment.id, 'submissions', user.uid);
      const submissionSnap = await getDoc(submissionRef);
      if (submissionSnap.exists()) {
         const fetchedSubmission = submissionSnap.data() as Submission;
         // We primarily care about the status to disable submission if already submitted
         setSubmission(fetchedSubmission);
         if(fetchedSubmission.status === 'Submitted') {
            toast({ title: 'Already Submitted', description: 'You have already submitted this assignment.' });
         } else if (fetchedSubmission.responseText) {
            setResponseText(fetchedSubmission.responseText);
         } else if (fetchedSubmission.answers) {
            setMcqAnswers(fetchedSubmission.answers);
         }

      } else {
         // Default status if no submission doc exists
         setSubmission({ status: 'Not Started' });
      }
    } catch (e) {
      console.error("Error fetching submission status:", e);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch submission status.' });
      setSubmission({ status: 'Not Started' }); // Assume not started on error
    }
  };


  const handleMcqAnswerChange = (questionIndex: number, answer: string) => {
    setMcqAnswers((prevAnswers) => {
        const newAnswers = [...prevAnswers];
        newAnswers[questionIndex] = answer;
        return newAnswers;
     });
  };

  const handleSubmitAssignment = async () => {
     if (!selectedAssignment || !user) return;

     setIsSubmitting(true);
     setError(null);

     const submissionRef = doc(
       db,
       'assignments',
       selectedAssignment.id,
       'submissions',
       user.uid
     );

     const submissionData: Partial<Submission> = { // Use Partial for initial data
       status: 'Submitted',
       submittedAt: serverTimestamp(), // Use server timestamp
     };

     if (selectedAssignment.type === 'MCQ') {
       // Ensure all questions are answered (optional, depends on requirements)
       if (mcqAnswers.some(answer => answer === '')) {
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

     try {
       // Use setDoc with merge: true if you want to update existing fields or create if not exists
       await setDoc(submissionRef, submissionData, { merge: true });

       setSubmission({ // Update local state immediately
           ...submission, // Keep existing grade/feedback if any
           status: 'Submitted',
           submittedAt: new Date(), // Approximate with client time for UI
           answers: selectedAssignment.type === 'MCQ' ? mcqAnswers : undefined,
           responseText: selectedAssignment.type !== 'MCQ' ? responseText : undefined,
       });
       toast({title: 'Success', description: 'Assignment submitted successfully.'});
       setSelectedAssignment(null); // Close the detail view
       fetchAssignmentsAndSubmissions(); // Re-fetch to update the list
     } catch (error: any) {
       console.error('Error submitting assignment:', error);
       setError('Failed to submit assignment. Please try again.');
       toast({
         variant: 'destructive',
         title: 'Error',
         description: 'Could not submit assignment.',
       });
     } finally {
       setIsSubmitting(false);
     }
   };


  const formatDueDate = (dueDate: Timestamp | Date | null): string => {
    if (!dueDate) return 'No due date';
    const date = dueDate instanceof Timestamp ? dueDate.toDate() : dueDate;
    // Ensure 'date' is a valid Date object before formatting
    if (date instanceof Date && !isNaN(date.getTime())) {
      return format(date, 'PPP p'); // Format like 'Jun 20, 2024 5:00 PM'
    }
    return 'Invalid date';
  };

  // Show loading indicator if auth or assignments are loading
  if (authLoading || isLoading) {
    return <div className="container mx-auto py-8 text-center"><span className="loader"></span></div>;
  }

  // Show error message if any
  if (error) {
    return <div className="container mx-auto py-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-4xl mx-auto shadow-lg rounded-lg">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-2xl font-semibold">My Assignments</CardTitle>
          <CardDescription>View and complete your assigned tasks.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">

          {selectedAssignment ? (
            <div className="space-y-6">
               <Button variant="outline" size="sm" onClick={() => setSelectedAssignment(null)} className="mb-4">
                 &larr; Back to List
               </Button>
              <Card className="border rounded-lg shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/50 p-4 border-b">
                     <CardTitle className="text-xl">{selectedAssignment.title}</CardTitle>
                      <Badge variant={selectedAssignment.type === 'MCQ' ? 'secondary' : 'outline'} className="w-fit">
                         {selectedAssignment.type}
                      </Badge>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <p className="text-muted-foreground">{selectedAssignment.description}</p>
                    <p className="text-sm font-medium">
                       Due: {formatDueDate(selectedAssignment.dueDate)}
                    </p>


                    {/* Submission Area */}
                    {submission?.status !== 'Submitted' && (
                      <>
                        {selectedAssignment.type === 'MCQ' && selectedAssignment.mcqQuestions && (
                          <div className="space-y-6 mt-4">
                            <h4 className="font-semibold text-lg">Questions:</h4>
                            {selectedAssignment.mcqQuestions.map((question, index) => (
                              <div key={index} className="p-4 border rounded-md bg-background">
                                <p className="font-medium mb-3">{index + 1}. {question.question}</p>
                                <RadioGroup
                                  value={mcqAnswers[index]}
                                  onValueChange={(value) => handleMcqAnswerChange(index, value)}
                                  className="space-y-2"
                                >
                                  {question.options.map((option, i) => (
                                    <div key={option + i} className="flex items-center space-x-2">
                                      <RadioGroupItem value={option} id={`q-${index}-option-${i}`} />
                                      <Label htmlFor={`q-${index}-option-${i}`}>{option}</Label>
                                    </div>
                                  ))}
                                </RadioGroup>
                              </div>
                            ))}
                          </div>
                        )}

                        {selectedAssignment.type !== 'MCQ' && (
                          <div className="grid gap-2 mt-4">
                             <Label htmlFor="responseText" className="font-semibold text-lg">Your Response:</Label>
                            <Textarea
                              id="responseText"
                              value={responseText}
                              onChange={(e) => setResponseText(e.target.value)}
                              placeholder="Type your response here..."
                              rows={8}
                              className="resize-none"
                            />
                          </div>
                        )}

                        <Button
                          onClick={handleSubmitAssignment}
                          disabled={isSubmitting}
                          className="mt-6 w-full"
                         >
                          {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
                        </Button>
                       </>
                     )}

                    {/* Display if already submitted */}
                    {submission?.status === 'Submitted' && (
                       <div className="mt-6 p-4 border border-green-300 bg-green-50 rounded-md text-green-700">
                          <p className="font-semibold">Assignment Submitted</p>
                           {submission.submittedAt && <p className="text-sm">Submitted on: {formatDueDate(submission.submittedAt)}</p>}
                           {/* Optionally display submitted answers/response */}
                           {submission.answers && <p className="text-sm mt-2">Your answers: {submission.answers.join(', ')}</p>}
                           {submission.responseText && <p className="text-sm mt-2">Your response: {submission.responseText}</p>}
                           {submission.grade && <p className="text-sm mt-2 font-semibold">Grade: {submission.grade}</p>}
                           {submission.feedback && <p className="text-sm mt-2">Feedback: {submission.feedback}</p>}
                       </div>
                    )}
                   </CardContent>
                 </Card>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.length === 0 && (
                <p className="text-center text-muted-foreground">No assignments due at the moment.</p>
              )}
              {assignments.map((assignment) => (
                <Card key={assignment.id} className="border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
                  <CardHeader className="flex flex-row justify-between items-start p-4">
                      <div>
                         <CardTitle className="text-lg font-medium">{assignment.title}</CardTitle>
                         <Badge variant={assignment.type === 'MCQ' ? 'secondary' : 'outline'} className="mt-1 w-fit">{assignment.type}</Badge>
                      </div>
                     <Button variant="outline" size="sm" onClick={() => handleStartAssignment(assignment)}>
                       Start
                     </Button>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                     <p className="text-sm text-muted-foreground">
                        Due: {formatDueDate(assignment.dueDate)}
                     </p>
                   </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudentAssignmentsPage;