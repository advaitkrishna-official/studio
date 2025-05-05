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
} from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

type AssignmentType = 'Written' | 'MCQ' | 'Test' | 'Other';

interface BaseAssignment {
  id: string;
  title: string;
  description: string;
  dueDate: Timestamp | Date | null;
  assignedTo: { classId: string; studentIds: string[] };
  createdBy: string;
  createdAt: Timestamp;
  type: AssignmentType;
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
  submittedAt?: Timestamp | Date;
  answers?: string[];
  responseText?: string;
  grade?: string;
  feedback?: string;
}

const StudentAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, userClass, loading: authLoading } = useAuth();
  const [mcqAnswers, setMcqAnswers] = useState<string[]>([]);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDueDate = (dueDate: Timestamp | Date | null) => {
    if (!dueDate) return 'No due date';
    const d = dueDate instanceof Timestamp ? dueDate.toDate() : dueDate;
    if (!(d instanceof Date) || isNaN(d.getTime())) return 'Invalid date';
    return format(d, 'PPP p');
  };

  const fetchAssignments = useCallback(async () => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }
    if (!user?.uid) {
      setError('Log in to view assignments.');
      setIsLoading(false);
      return;
    }
    if (!userClass) {
      console.warn('Class not set yet.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'assignments'),
        where('assignedTo.classId', '==', userClass)
      );
      const snap = await getDocs(q);
      const docs: Assignment[] = [];
      const subFetches: Promise<{ id: string; sub?: Submission }>[] = [];

      snap.forEach(docSnap => {
        const d = docSnap.data() as DocumentData;
        let due: Date | null = null;
        if (d.dueDate instanceof Timestamp) due = d.dueDate.toDate();
        else if (d.dueDate instanceof Date) due = d.dueDate;
        else if (typeof d.dueDate === 'string') due = new Date(d.dueDate);
        const asg: Assignment = {
          id: docSnap.id,
          title: d.title,
          description: d.description,
          type: d.type,
          dueDate: due,
          assignedTo: d.assignedTo,
          createdBy: d.createdBy,
          createdAt: d.createdAt,
          mcqQuestions: d.type === 'MCQ' ? d.mcqQuestions : undefined,
        };
        const assigned =
          !asg.assignedTo.studentIds?.length ||
          (asg.assignedTo.studentIds?.includes(user.uid));
        if (assigned) {
          docs.push(asg);
          const subRef = doc(db, 'assignments', asg.id, 'submissions', user.uid);
          subFetches.push(
            getDoc(subRef).then(snap => ({ id: asg.id, sub: snap.data() as Submission }))
          );
        }
      });

      const subs = await Promise.all(subFetches);
      const subMap = new Map(subs.map(s => [s.id, s.sub]));

      const filtered = docs
        .filter(a => {
          const s = subMap.get(a.id);
          return !s || s.status !== 'Submitted';
        })
        .sort((a, b) => {
          const ta = a.dueDate instanceof Date ? a.dueDate.getTime() : Infinity;
          const tb = b.dueDate instanceof Date ? b.dueDate.getTime() : Infinity;
          return ta - tb;
        });

      setAssignments(filtered);
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load assignments.' });
      setError('Failed to load assignments.');
    } finally {
      setIsLoading(false);
    }
  }, [user, userClass, authLoading, toast]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const handleStart = async (a: Assignment) => {
    setSelectedAssignment(a);
    setSubmission(null);
    setResponseText('');
    setMcqAnswers(a.type === 'MCQ' && a.mcqQuestions ? Array(a.mcqQuestions.length).fill('') : []);
    try {
      const subRef = doc(db, 'assignments', a.id, 'submissions', user!.uid);
      const snap = await getDoc(subRef);
      if (snap.exists()) {
        const s = snap.data() as Submission;
        setSubmission(s);
        if (s.responseText) setResponseText(s.responseText);
        if (s.answers) setMcqAnswers(s.answers);
      } else {
        setSubmission({ status: 'Not Started' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load submission.' });
      setSubmission({ status: 'Not Started' });
    }
  };

  const handleAnswerChange = (i: number, v: string) => {
    setMcqAnswers(prev => {
      const arr = [...prev];
      arr[i] = v;
      return arr;
    });
  };

  const handleSubmit = async () => {
    if (!selectedAssignment) return;
    setIsSubmitting(true);
    try {
      const ref = doc(db, 'assignments', selectedAssignment.id, 'submissions', user!.uid);
      const data: any = {
        status: 'Submitted',
        submittedAt: serverTimestamp(),
      };
      if (selectedAssignment.type === 'MCQ') {
        if (mcqAnswers.some(a => !a)) {
          toast({ variant: 'destructive', title: 'Error', description: 'Answer all questions.' });
          setIsSubmitting(false);
          return;
        }
        data.answers = mcqAnswers;
      } else {
        if (!responseText.trim()) {
          toast({ variant: 'destructive', title: 'Error', description: 'Enter a response.' });
          setIsSubmitting(false);
          return;
        }
        data.responseText = responseText;
      }
      await setDoc(ref, data, { merge: true });
      toast({ title: 'Submitted', description: 'Assignment submitted!' });
      setSelectedAssignment(null);
      fetchAssignments();
    } catch {
      toast({ variant: 'destructive', title: 'Error', description: 'Submit failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="container mx-auto py-8 text-center">
        <span>Loading…</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="container mx-auto py-8 text-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>My Assignments</CardTitle>
          <CardDescription>Complete your tasks below.</CardDescription>
        </CardHeader>
        <CardContent>
          {selectedAssignment ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setSelectedAssignment(null)}>
                ← Back
              </Button>
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>{selectedAssignment.title}</CardTitle>
                  <Badge>
                    {selectedAssignment.type}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p className="mb-2">{selectedAssignment.description}</p>
                  <p className="text-sm">Due: {formatDueDate(selectedAssignment.dueDate)}</p>

                  {submission?.status !== 'Submitted' && (
                    <>
                      {selectedAssignment.type === 'MCQ' &&
                        selectedAssignment.mcqQuestions && (
                          <div className="mt-4 space-y-4">
                            {selectedAssignment.mcqQuestions.map((q, idx) => (
                              <div key={idx}>
                                <p className="font-medium">{idx+1}. {q.question}</p>
                                <RadioGroup
                                  value={mcqAnswers[idx]}
                                  onValueChange={v => handleAnswerChange(idx,v)}
                                >
                                  {q.options.map(opt => (
                                    <div key={opt} className="flex items-center">
                                      <RadioGroupItem value={opt} id={`${idx}-${opt}`} />
                                      <Label htmlFor={`${idx}-${opt}`}>{opt}</Label>
                                    </div>
                                  ))}
                                </RadioGroup>
                              </div>
                            ))}
                          </div>
                        )}

                      {selectedAssignment.type !== 'MCQ' && (
                        <div className="mt-4">
                          <Label>Response</Label>
                          <Textarea
                            value={responseText}
                            onChange={e => setResponseText(e.target.value)}
                            rows={6}
                          />
                        </div>
                      )}

                      <Button
                        className="mt-4"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Submitting…' : 'Submit'}
                      </Button>
                    </>
                  )}

                  {submission?.status === 'Submitted' && (
                    <div className="mt-4 p-4 bg-green-50 rounded">
                      <p className="font-semibold">Submitted on {formatDueDate(submission.submittedAt || null)}</p>
                      {submission.grade && <p>Grade: {submission.grade}</p>}
                      {submission.feedback && <p>Feedback: {submission.feedback}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="space-y-4">
              {assignments.length === 0 && (
                <p>No assignments assigned.</p>
              )}
              {assignments.map(a => (
                <Card key={a.id} className="flex justify-between items-center p-4 hover:shadow">
                  <div>
                    <CardTitle>{a.title}</CardTitle>
                    <p className="text-sm">Due: {formatDueDate(a.dueDate)}</p>
                  </div>
                  <Button onClick={() => handleStart(a)}>Start</Button>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StudentAssignmentsPage;
