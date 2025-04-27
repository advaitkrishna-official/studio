'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  setDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

type AssignmentType = 'Written' | 'MCQ' | 'Test' | 'Other';

interface Assignment {
  id: string;
  title: string;
  description: string;
  type: AssignmentType;
  dueDate: any;
  assignedTo: {
    classId: string;
    studentIds: string[];
  };
  createdBy: string;
  createdAt: any;
  mcqQuestions?: {
    question: string;
    options: string[];
    correctAnswer: string;
  }[];
}

interface Submission {
  status: 'Not Started' | 'Submitted' | 'Overdue';
  submittedAt?: any;
  answers?: string[];
  responseText?: string;
  grade?: string;
  feedback?: string;
}

const StudentAssignmentsPage = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [mcqAnswers, setMcqAnswers] = useState<string[]>([]);
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    const fetchAssignments = async () => {
      if (user?.uid) {
        const studentDocRef = doc(db, 'students', user.uid);
        const studentDocSnap = await getDoc(studentDocRef);
        if (studentDocSnap.exists()) {
          const studentData = studentDocSnap.data();
          const currentClassId = studentData.classId;
          const q = query(
            collection(db, 'assignments'),
            where('assignedTo.classId', '==', currentClassId)
          );
          const querySnapshot = await getDocs(q);
          const assignmentsData = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Assignment[];
          setAssignments(assignmentsData);
        }
      }
    };

    fetchAssignments();
  }, [user]);

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
    if (submissionSnap.exists()) {
        setSubmission(submissionSnap.data() as Submission);
      }else{
        setSubmission({status: "Not Started"});
      }
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
    await setDoc(submissionRef, {
      status: 'Submitted',
      submittedAt: serverTimestamp(),
      answers: mcqAnswers,
    });
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
              <p>Due: {selectedAssignment.dueDate.toDate().toLocaleString()}</p>
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
                  <p>Due: {assignment.dueDate.toDate().toLocaleString()}</p>
                  <Button onClick={() => handleStartAssignment(assignment)}>
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
};

export default StudentAssignmentsPage;