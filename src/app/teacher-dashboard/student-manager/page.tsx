"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  DocumentData,
} from "firebase/firestore";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

type Student = {
  id: string;
  email: string;
  class: string;
  studentNumber: string;
  role: string;
  lastMessage?: string;
  progress?: Record<string, number>;
};

type Grade = {
  taskName: string;
  score: number;
  feedback: string;
};

type StudentDetails = Student & {
  grades: Grade[];
};

const StudentManagerPage: React.FC = () => {
  const { user, userClass } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>(userClass ?? "");
  // Update classes state to include all grades from 1 to 8
  const [classes] = useState<string[]>([
    "Grade 1", "Grade 2", "Grade 3", "Grade 4",
    "Grade 5", "Grade 6", "Grade 7", "Grade 8"
  ]);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);

  // Listen for students in the selected class
  useEffect(() => {
    if (!user) return;
    if (!selectedClass) {
        setStudents([]); // Clear students if no class is selected
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);

    const q = query(
      collection(db, "Users"), // Ensure correct collection name 'Users'
      where("class", "==", selectedClass),
      where("role", "==", "student")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => {
          const doc = d.data() as DocumentData;
          // Calculate overall progress if progress object exists
          let overallProgress = 0;
          const progressData = doc.progress as Record<string, number> | undefined;
          if (progressData && Object.keys(progressData).length > 0) {
            const scores = Object.values(progressData);
            const validScores = scores.filter(s => typeof s === 'number' && !isNaN(s));
            if (validScores.length > 0) {
              overallProgress = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
            }
          }

          return {
            id: d.id,
            email: doc.email,
            class: doc.class,
            studentNumber: doc.studentNumber,
            role: doc.role,
            lastMessage: doc.lastMessage,
            progress: progressData ?? {}, // Use fetched progress or default to empty object
            overallProgress: overallProgress, // Add the calculated overall progress
          };
        });
        setStudents(data);
        setIsLoading(false);
      },
      (e) => {
        setError(e.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, selectedClass]);

  // View detailed student info + grades
  const handleViewDetails = async (studentId: string) => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    try {
      // Fetch the student doc
      const studentRef = doc(db, "Users", studentId); // Ensure correct collection name 'Users'
      const snap = await getDoc(studentRef);
      if (!snap.exists()) throw new Error("Student not found.");

      const data = snap.data() as DocumentData;

      // Fetch their grades subcollection
      const gradesSnap = await getDocs(collection(studentRef, "grades"));
      const grades: Grade[] = gradesSnap.docs.map((g) => {
        const gd = g.data() as DocumentData;
        return {
          taskName: gd.taskName,
          score: Number(gd.score ?? 0),
          feedback: gd.feedback,
        };
      });

      // Build full StudentDetails object
      setSelectedStudent({
        id: studentId,
        email: data.email,
        class: data.class,
        studentNumber: data.studentNumber,
        role: data.role,
        lastMessage: data.lastMessage,
        progress: (data.progress as Record<string, number>) ?? {},
        grades,
      });
    } catch (e: any) {
      setError(e.message);
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Update a single subject’s progress
  const handleUpdateProgress = async (
    studentId: string,
    subject: string,
    newProgress: number
  ) => {
    try {
      const studentRef = doc(db, "Users", studentId); // Ensure correct collection name 'Users'
      await updateDoc(studentRef, {
        [`progress.${subject}`]: newProgress,
      });
      // Update local state
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId
            ? {
                ...s,
                progress: { ...(s.progress ?? {}), [subject]: newProgress },
              }
            : s
        )
      );
       // Also update the selectedStudent details if it's the one being edited
       if (selectedStudent && selectedStudent.id === studentId) {
         setSelectedStudent(prev => prev ? ({
           ...prev,
           progress: { ...(prev.progress ?? {}), [subject]: newProgress },
         }) : null);
       }
      toast({
        title: "Progress Updated",
        description: `${subject} set to ${newProgress}%`,
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  // “Send” a message by writing lastMessage
  const handleSendMessage = async (studentId: string, message: string) => {
    try {
      const studentRef = doc(db, "Users", studentId); // Ensure correct collection name 'Users'
      await updateDoc(studentRef, { lastMessage: message });
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId ? { ...s, lastMessage: message } : s
        )
      );
      // Also update the selectedStudent details if it's the one being messaged
      if (selectedStudent && selectedStudent.id === studentId) {
        setSelectedStudent(prev => prev ? ({ ...prev, lastMessage: message }) : null);
      }
      toast({ title: "Message Sent", description: message });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Student Manager</h1>
      <p className="text-gray-600 mb-6">Manage your students’ profiles and progress.</p>

      {/* Class selector */}
      <div className="grid gap-2 mb-6 max-w-sm">
        <Label htmlFor="class">Select Class</Label>
        <Select
          defaultValue={selectedClass}
          onValueChange={setSelectedClass}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((cls) => (
              <SelectItem key={cls} value={cls}>
                {cls}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p>Loading students…</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!isLoading && !error && students.length === 0 && selectedClass && (
        <p className="text-center text-gray-500 py-8">No students found in {selectedClass}.</p>
      )}
      {!isLoading && !error && !selectedClass && (
        <p className="text-center text-gray-500 py-8">Please select a class to view students.</p>
      )}


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map((s: any) => ( // Use 'any' temporarily if overallProgress is added dynamically
          <Card key={s.id} className="shadow-sm hover:shadow-md transition-shadow border border-gray-200 flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">{s.email}</CardTitle>
              <CardDescription>
                Student #: {s.studentNumber}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 flex-grow">
             {/* Display Overall Progress First */}
              <div className="mb-4">
                  <div className="flex justify-between mb-1 text-sm font-medium">
                    <span>Overall Progress</span>
                    <span>{s.overallProgress !== undefined ? `${s.overallProgress.toFixed(1)}%` : 'N/A'}</span>
                  </div>
                   <Progress value={s.overallProgress !== undefined ? s.overallProgress : 0} className="h-2"/>
                </div>
             <Separator /> {/* Separator */}

              {/* Subject-wise progress (optional - can be hidden initially or shown in details) */}
              {/* {s.progress && Object.keys(s.progress).length > 0 ? (
                Object.entries(s.progress).map(([subj, val]) => (
                  <div key={subj}>
                    <div className="flex justify-between mb-1 text-xs">
                      <span>{subj}</span>
                      <span>{val}%</span>
                    </div>
                    <Progress value={val} className="h-1.5" />
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">No subject progress yet.</p>
              )} */}

              <div className="flex gap-2 mt-auto pt-4"> {/* mt-auto pushes buttons down */}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleViewDetails(s.id)}
                  className="flex-1"
                >
                  View Details
                </Button>
                <EditProgressDialog
                  studentId={s.id}
                  currentProgress={s.progress || {}}
                  onUpdateProgress={handleUpdateProgress}
                />
                <SendMessageDialog
                  studentId={s.id}
                  onSendMessage={handleSendMessage}
                />
              </div>

              {s.lastMessage && (
                <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                  Last Message: {s.lastMessage}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Details Drawer */}
      <StudentDetailsDialog
        student={selectedStudent}
        isLoading={isLoading}
        error={error}
        onClose={() => setSelectedStudent(null)}
        onUpdateProgress={handleUpdateProgress} // Pass down update handler
      />
    </div>
  );
};

// ——— Edit Progress ———
interface EditProgressDialogProps {
  studentId: string;
  currentProgress: Record<string, number>;
  onUpdateProgress: (
    studentId: string,
    subject: string,
    newProgress: number
  ) => void;
}
const EditProgressDialog: React.FC<EditProgressDialogProps> = ({
  studentId,
  currentProgress,
  onUpdateProgress,
}) => {
  const subjectOptions = ["Math", "Science", "History", "English"]; // Or fetch dynamically
  const [subject, setSubject] = useState(subjectOptions[0] || "");
  const [progress, setProgress] = useState(currentProgress[subject] || 0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Update progress field when subject changes
    setProgress(currentProgress[subject] || 0);
  }, [currentProgress, subject]);

   const handleSave = async () => {
       setIsSaving(true);
       await onUpdateProgress(studentId, subject, progress);
       setIsSaving(false);
       // Consider closing the dialog here if needed using DialogClose or state management
   };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Icons.edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {subject} Progress</DialogTitle>
          <DialogDescription>
            Update progress percentage for {subject}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="subject-edit" className="text-right">
              Subject
            </Label>
            <Select
              defaultValue={subject}
              onValueChange={setSubject}
            >
              <SelectTrigger id="subject-edit" className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subjectOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="progress-edit" className="text-right">
              Progress (%)
            </Label>
            <Input
              id="progress-edit"
              type="number"
              value={progress}
              onChange={(e) => setProgress(Math.max(0, Math.min(100, Number(e.target.value))))} // Clamp between 0 and 100
              className="col-span-3"
              min="0"
              max="100"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
             {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ——— Send Message ———
interface SendMessageDialogProps {
  studentId: string;
  onSendMessage: (studentId: string, message: string) => void;
}
const SendMessageDialog: React.FC<SendMessageDialogProps> = ({
  studentId,
  onSendMessage,
}) => {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
      if (!message.trim()) return; // Prevent sending empty messages
      setIsSending(true);
      await onSendMessage(studentId, message);
      setIsSending(false);
      setMessage(""); // Clear message after sending
      // Consider closing the dialog here
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Icons.messageSquare className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Message</DialogTitle>
          <DialogDescription>Type your message below.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="msg-send">Message</Label>
          <Textarea
            id="msg-send"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message..."
            rows={4}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSend} disabled={isSending || !message.trim()}>
            {isSending ? "Sending..." : "Send Message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ——— Details Dialog ———
interface StudentDetailsDialogProps {
  student: StudentDetails | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onUpdateProgress: (studentId: string, subject: string, newProgress: number) => void; // Receive update handler
}
const StudentDetailsDialog: React.FC<StudentDetailsDialogProps> = ({
  student,
  isLoading,
  error,
  onClose,
  onUpdateProgress, // Destructure the handler
}) => {
  if (!student) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{student.email} Details</DialogTitle>
          <DialogDescription>
            View and manage this student’s records.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] p-1"> {/* Added ScrollArea and padding */}
            <div className="space-y-6 p-4"> {/* Added container div with padding */}
              <Card>
                <CardHeader>
                  <CardTitle>Info</CardTitle>
                  <CardDescription>Basic profile</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p><strong>Email:</strong> {student.email}</p>
                  <p><strong>Student #:</strong> {student.studentNumber || 'N/A'}</p>
                  <p><strong>Class:</strong> {student.class || 'N/A'}</p>
                  <p><strong>Role:</strong> {student.role || 'N/A'}</p>
                   {student.lastMessage && (
                     <p className="pt-2 border-t mt-2"><strong>Last Message Sent:</strong> {student.lastMessage}</p>
                   )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle>Progress</CardTitle>
                  <CardDescription>Subject-wise %</CardDescription>
                  {/* Add Edit button here to trigger the same EditProgressDialog */}
                  <EditProgressDialog
                      studentId={student.id}
                      currentProgress={student.progress || {}}
                      onUpdateProgress={onUpdateProgress}
                  />
                </CardHeader>
                <CardContent>
                  {student.progress && Object.keys(student.progress).length > 0 ? (
                    <div className="space-y-3">
                       {Object.entries(student.progress).map(([subj, val]) => (
                      <div key={subj} className="mb-2">
                        <div className="flex justify-between mb-1 text-sm">
                          <span className="font-medium">{subj}</span>
                          <span>{val}%</span>
                        </div>
                        <Progress value={val} className="h-2" />
                      </div>
                    ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No progress data.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Scores</CardTitle>
                  <CardDescription>Assignment/Test grades</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                      <p>Loading grades...</p>
                  ) : error ? (
                       <p className="text-red-500">Error loading grades: {error}</p>
                  ) : student.grades.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Task</TableHead>
                          <TableHead className="text-right">Score</TableHead>
                          <TableHead>Feedback</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {student.grades.map((g, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{g.taskName}</TableCell>
                            <TableCell className="text-right">{g.score}%</TableCell>
                            <TableCell>{g.feedback || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-sm">No grades available.</p>
                  )}
                </CardContent>
              </Card>
            </div>
        </ScrollArea>

        <DialogFooter className="mt-4"> {/* Added margin top */}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentManagerPage;
