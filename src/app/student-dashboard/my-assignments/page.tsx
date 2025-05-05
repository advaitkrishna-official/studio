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
  dueDate: Date;
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

// Format a Firestore Timestamp or JS Date
const formatDueDate = (due: Date | Timestamp | null | undefined): string => {
  if (!due) return 'No due date';
  const d = due instanceof Timestamp ? due.toDate() : due;
  return isNaN(d.getTime()) ? 'Invalid date' : format(d, 'PPP p');
};

const getBadgeVariant = (
  status: Submission['status'] | 'Due'
): 'default' | 'secondary' | 'destructive' => {
  switch (status) {
    case 'Submitted':
    case 'Graded':
      return 'default';
    case 'Overdue':
      return 'destructive';
    case 'Not Started':
    case 'Due':
    default:
      return 'secondary';
  }
};

export default function StudentAssignmentsPage() {
  const { user, userClass, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [selected, setSelected] = useState<Assignment | null>(null);
  const [mcqAnswers, setMcqAnswers] = useState<string[]>([]);
  const [responseText, setResponseText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep track of all submission listeners so we can clean them up
  const submissionUnsubs = useRef<(() => void)[]>([]);

  // Real‑time listener for assignments
  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid || !userClass) {
      setAssignments([]);
      setSubmissions({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(db, 'assignments'),
      where('assignedTo.classId', '==', userClass),
      orderBy('dueDate', 'asc')
    );

    const unsub = onSnapshot(
      q,
      snap => {
        const fetched: Assignment[] = [];
        snap.docs.forEach(d => {
          const data = d.data() as DocumentData;
          const rawDue = data.dueDate;
          const due =
            rawDue instanceof Timestamp ? rawDue.toDate() : new Date(rawDue);
          if (isNaN(due.getTime())) return;
          fetched.push({
            id: d.id,
            title: data.title,
            description: data.description,
            type: data.type,
            dueDate: due,
            assignedTo: data.assignedTo,
            createdBy: data.createdBy,
            createdAt: data.createdAt,
            mcqQuestions: data.type === 'MCQ' ? data.mcqQuestions : undefined,
          } as Assignment);
        });
        setAssignments(fetched);
        setLoading(false);
      },
      err => {
        console.error('Assignment listener error', err);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load assignments.' });
        setError('Failed to load assignments.');
        setLoading(false);
      }
    );

    return () => {
      unsub();
      // Clear any lingering submission listeners
      submissionUnsubs.current.forEach(u => u());
      submissionUnsubs.current = [];
    };
  }, [user, userClass, authLoading, toast]);

  // Real‑time listeners for each assignment's submission document
  useEffect(() => {
    // cleanup old
    submissionUnsubs.current.forEach(u => u());
    submissionUnsubs.current = [];

    if (!user?.uid) return;

    const newSubs: Record<string, Submission> = {};

    assignments.forEach(a => {
      const ref = doc(db, 'assignments', a.id, 'submissions', user.uid);
      const unsub = onSnapshot(
        ref,
        snap => {
          if (snap.exists()) {
            newSubs[a.id] = snap.data() as Submission;
          } else {
            newSubs[a.id] = { status: 'Not Started' };
          }
          setSubmissions(prev => ({ ...prev, ...newSubs }));
        },
        err => {
          console.error(`Submission listener error for ${a.id}`, err);
        }
      );
      submissionUnsubs.current.push(unsub);
    });

    return () => {
      submissionUnsubs.current.forEach(u => u());
      submissionUnsubs.current = [];
    };
  }, [assignments, user]);

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

  const start = (a: Assignment) => {
    setSelected(a);
    setResponseText(submissions[a.id]?.responseText || '');
    if (a.type === 'MCQ' && a.mcqQuestions) {
      setMcqAnswers(submissions[a.id]?.answers || Array(a.mcqQuestions.length).fill(''));
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
    if (!selected || !user) return;
    setIsSubmitting(true);

    const subRef = doc(db, 'assignments', selected.id, 'submissions', user.uid);
    const data: Partial<Submission> = {
      status: 'Submitted',
      submittedAt: serverTimestamp() as Timestamp,
    };

    if (selected.type === 'MCQ') {
      if (mcqAnswers.some(a => !a)) {
        toast({ variant: 'destructive', title: 'Incomplete', description: 'Answer all questions.' });
        setIsSubmitting(false);
        return;
      }
      data.answers = mcqAnswers;
    } else {
      if (!responseText.trim()) {
        toast({ variant: 'destructive', title: 'Incomplete', description: 'Provide your response.' });
        setIsSubmitting(false);
        return;
      }
      data.responseText = responseText;
    }

    try {
      await setDoc(subRef, data, { merge: true });
      toast({ title: 'Success', description: 'Submitted!' });
      setSelected(null);
    } catch (e) {
      console.error('Submit error', e);
      toast({ variant: 'destructive', title: 'Error', description: 'Submission failed.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <h1 className="text-3xl font-bold mb-6">My Assignments</h1>

      {loading && <div className="loader mx-auto" />}
      {error && <p className="text-red-500 text-center">{error}</p>}

      {!loading && !error && assignments.length === 0 && (
        <p className="text-center">You have no assignments.</p>
      )}

      {!loading && !error && !selected && assignments.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {assignments.map(a => {
            const status = getStatus(a.id, a.dueDate);
            const sub = submissions[a.id];
            const done = sub?.status === 'Submitted' || sub?.status === 'Graded';

            return (
              <Card key={a.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between">
                    <CardTitle>{a.title}</CardTitle>
                    <Badge variant={getBadgeVariant(status)}>
                      {status}
                    </Badge>
                  </div>
                  <CardDescription>Due: {formatDueDate(a.dueDate)}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  {a.description}
                </CardContent>
                <div className="p-4">
                  <Button
                    onClick={() => start(a)}
                    disabled={done}
                    className={done ? 'bg-gray-400' : 'bg-indigo-600'}
                  >
                    {done ? 'View' : 'Start'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </motion.div>
      )}

      {selected && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
          <Button variant="outline" onClick={() => setSelected(null)}>
            ← Back
          </Button>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>{selected.title}</CardTitle>
              <CardDescription>Due: {formatDueDate(selected.dueDate)}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{selected.description}</p>

              {/* MCQ */}
              {selected.type === 'MCQ' && selected.mcqQuestions && (
                <div className="space-y-4">
                  {selected.mcqQuestions.map((q, i) => (
                    <div key={i} className="border p-3">
                      <Label className="block mb-2">
                        {i + 1}. {q.question}
                      </Label>
                      <RadioGroup
                        value={mcqAnswers[i]}
                        onValueChange={v => handleAnswerChange(i, v)}
                      >
                        {q.options.map((opt, idx) => (
                          <div key={idx} className="flex items-center space-x-2 mb-1">
                            <RadioGroupItem id={`opt-${i}-${idx}`} value={opt} />
                            <Label htmlFor={`opt-${i}-${idx}`}>{opt}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  ))}
                </div>
              )}

              {/* Written */}
              {selected.type !== 'MCQ' && (
                <Textarea
                  value={responseText}
                  onChange={e => setResponseText(e.target.value)}
                  rows={6}
                  placeholder="Your response..."
                />
              )}

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="mt-4 bg-green-600"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </>
  );
}
