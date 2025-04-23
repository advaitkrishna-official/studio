"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, updateDoc, query, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { z } from "zod";

const StudentManagerPage = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, userClass } = useAuth();
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState(userClass || ""); // Initialize with userClass
  const [classes, setClasses] = useState<string[]>(["Grade 8", "Grade 6", "Grade 4"]); // Static class options
  const [cachedStudentData, setCachedStudentData] = useState<any[]>([]);

  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!user) {
          setError("User not logged in.");
          return;
        }

        // Fetch student data from Firestore, filtered by selected class
        const studentsCollection = collection(db, "users");
        const q = query(studentsCollection, where("class", "==", selectedClass));
        const studentsSnapshot = await getDocs(q);
        const studentsData = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Cache student data
        localStorage.setItem('studentData', JSON.stringify(studentsData));
        setCachedStudentData(studentsData); // Also set it to state for immediate use

        setStudents(studentsData);
      } catch (e: any) {
        setError(e.message || "An error occurred while fetching students.");
        // If offline, try to use cached data
        const cachedData = localStorage.getItem('studentData');
        if (cachedData) {
          try {
            const studentsData = JSON.parse(cachedData);
            setCachedStudentData(studentsData);
            setStudents(studentsData);
            setError("Offline mode: Using cached student data.");
          } catch (parseError: any) {
            setError(`Error parsing cached data: ${parseError.message}`);
          }
        } else {
          setError("Offline mode: No cached student data available.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [user, selectedClass]);

  const handleUpdateProgress = async (studentId: string, subject: string, newProgress: number) => {
    try {
      setIsLoading(true);
      setError(null);
      const studentDocRef = doc(db, "users", studentId);

      // Prepare the update: use dot notation to update nested field
      const updatePayload: { [key: string]: any } = {};
      updatePayload[`progress.${subject}`] = newProgress; // e.g., 'progress.Math': 85

      await updateDoc(studentDocRef, updatePayload);

      // Update the local state
      setStudents(prevStudents =>
        prevStudents.map(student => {
          if (student.id === studentId) {
            return {
              ...student,
              progress: {
                ...student.progress,
                [subject]: newProgress,
              }
            };
          }
          return student;
        })
      );

      toast({
        title: "Progress Updated",
        description: `Student progress in ${subject} updated successfully.`,
      });
    } catch (e: any) {
      setError(e.message || "An error occurred while updating progress.");
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Failed to update student progress.",
      });
    } finally {
      setIsLoading(false);
    }
  };


  const handleSendMessage = async (studentId: string, message: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // In a real application, you would send the message using a messaging service
      // For this example, we'll just update the student's profile with the message

      const studentDocRef = doc(db, "users", studentId);
      await updateDoc(studentDocRef, { lastMessage: message });

      setStudents(prevStudents =>
        prevStudents.map(student =>
          student.id === studentId ? { ...student, lastMessage: message } : student
        )
      );

      // Update cached data as well
      const updatedStudentData = students.map(student =>
        student.id === studentId ? { ...student, lastMessage: message } : student
      );
      localStorage.setItem('studentData', JSON.stringify(updatedStudentData));

      toast({
        title: "Message Sent",
        description: "Message sent to student successfully.",
      });
    } catch (e: any) {
      setError(e.message || "An error occurred while sending the message.");
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Failed to send message to student.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Student Manager</h1>
      <div>Manage your students' profiles and track their progress.</div>

       {/* Class Selection Dropdown */}
       <div className="grid gap-2 mb-4">
            <label htmlFor="class">Select Class</label>
            <Select onValueChange={setSelectedClass} defaultValue={userClass}>
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

      {isLoading && <p>Loading students...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map((student) => (
          <Card key={student.id}>
            <CardHeader>
              <CardTitle>{student.email}</CardTitle>
              <CardDescription>Student Number: {student.studentNumber}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div>
                {/* Subject-wise progress display */}
                {student.progress && Object.keys(student.progress).length > 0 ? (
                  Object.entries(student.progress).map(([subject, progress]) => (
                    <div key={subject} className="mb-2">
                      {subject}:
                      <Progress value={progress as number} />
                      {(progress as number) || 0}%
                      </div>
                  ))
                ) : (
                  <div>No progress data available.</div>
                )}
              </div>
              <div className="flex gap-2">
                <EditProgressDialog
                  studentId={student.id}
                  currentProgress={student.progress || {}} // Ensure it's an object
                  onUpdateProgress={handleUpdateProgress}
                />
                <SendMessageDialog
                  studentId={student.id}
                  onSendMessage={handleSendMessage}
                />
              </div>
              {student.lastMessage && (
                <p className="mt-2">Last Message: {student.lastMessage}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

interface EditProgressDialogProps {
  studentId: string;
  currentProgress: { [key: string]: number }; // Subject: Progress
  onUpdateProgress: (studentId: string, subject: string, newProgress: number) => void;
}

const EditProgressDialog: React.FC<EditProgressDialogProps> = ({ studentId, currentProgress, onUpdateProgress }) => {
  const [subject, setSubject] = useState(Object.keys(currentProgress)[0] || 'Math'); // Default subject
  const [progress, setProgress] = useState(currentProgress[subject] || 0);

  useEffect(() => {
    setProgress(currentProgress[subject] || 0);
  }, [currentProgress, subject]);

  const subjectOptions = ['Math', 'Science', 'History', 'English']; // Subject choices

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          Edit Progress <Icons.edit className="ml-2" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Student Progress</DialogTitle>
          <DialogDescription>
            Update the student's progress in {subject}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subject" className="text-right">
              Subject
            </Label>
            <Select onValueChange={setSubject} defaultValue={subject} className="col-span-3">
              <SelectTrigger>
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {subjectOptions.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="progress" className="text-right">
              Progress
            </Label>
            <Input
              type="number"
              id="progress"
              value={progress.toString()}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={() => onUpdateProgress(studentId, subject, progress)}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface SendMessageDialogProps {
  studentId: string;
  onSendMessage: (studentId: string, message: string) => void;
}

const SendMessageDialog: React.FC<SendMessageDialogProps> = ({ studentId, onSendMessage }) => {
  const [message, setMessage] = useState("");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          Send Message <Icons.messageSquare className="ml-2" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Message to Student</DialogTitle>
          <DialogDescription>
            Send a message to the student.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="message" className="text-right">
              Message
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={() => onSendMessage(studentId, message)}>
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentManagerPage;
