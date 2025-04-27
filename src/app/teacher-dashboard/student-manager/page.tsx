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
  const [classes] = useState<string[]>(["Grade 8", "Grade 6", "Grade 4"]);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);

  // Listen for students in the selected class
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    const q = query(
      collection(db, "users"),
      where("class", "==", selectedClass),
      where("role", "==", "student")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => {
          const doc = d.data() as DocumentData;
          return {
            id: d.id,
            email: doc.email,
            class: doc.class,
            studentNumber: doc.studentNumber,
            role: doc.role,
            lastMessage: doc.lastMessage,
            progress: (doc.progress as Record<string, number>) ?? {},
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
      const studentRef = doc(db, "users", studentId);
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
      const studentRef = doc(db, "users", studentId);
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
      const studentRef = doc(db, "users", studentId);
      await updateDoc(studentRef, { lastMessage: message });
      setStudents((prev) =>
        prev.map((s) =>
          s.id === studentId ? { ...s, lastMessage: message } : s
        )
      );
      toast({ title: "Message Sent", description: message });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Student Manager</h1>
      <p className="mb-4">Manage your students’ profiles and progress.</p>

      {/* Class selector */}
      <div className="grid gap-2 mb-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.map((s) => (
          <Card key={s.id}>
            <CardHeader>
              <CardTitle>{s.email}</CardTitle>
              <CardDescription>
                Student #: {s.studentNumber}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Progress bars */}
              {s.progress && Object.keys(s.progress).length > 0 ? (
                Object.entries(s.progress).map(([subj, val]) => (
                  <div key={subj}>
                    <div className="flex justify-between mb-1">
                      <span>{subj}</span>
                      <span>{val}%</span>
                    </div>
                    <Progress value={val} />
                  </div>
                ))
              ) : (
                <p>No progress yet.</p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleViewDetails(s.id)}
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
                <p className="text-sm text-muted-foreground">
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
  const [subject, setSubject] = useState(Object.keys(currentProgress)[0] || "Math");
  const [progress, setProgress] = useState(currentProgress[subject] || 0);
  const subjectOptions = ["Math", "Science", "History", "English"];

  useEffect(() => {
    setProgress(currentProgress[subject] || 0);
  }, [currentProgress, subject]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          Edit Progress <Icons.edit className="ml-2" />
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
            <Label htmlFor="subject" className="text-right">
              Subject
            </Label>
            <Select
              defaultValue={subject}
              onValueChange={setSubject}
            >
              <SelectTrigger>
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
            <Label htmlFor="progress" className="text-right">
              Progress
            </Label>
            <Input
              id="progress"
              type="number"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={() => onUpdateProgress(studentId, subject, progress)}>
            Save
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
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm">
          Send Message <Icons.messageSquare className="ml-2" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Message</DialogTitle>
          <DialogDescription>Type your message below.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="msg">Message</Label>
          <Textarea
            id="msg"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button onClick={() => onSendMessage(studentId, message)}>
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ——— Details Drawer ———
interface StudentDetailsDialogProps {
  student: StudentDetails | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}
const StudentDetailsDialog: React.FC<StudentDetailsDialogProps> = ({
  student,
  isLoading,
  error,
  onClose,
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
        <ScrollArea className="max-h-[500px] space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Info</CardTitle>
              <CardDescription>Basic profile</CardDescription>
            </CardHeader>
            <CardContent>
              <p><strong>Student #:</strong> {student.studentNumber}</p>
              <p><strong>Class:</strong> {student.class}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Progress</CardTitle>
              <CardDescription>Subject-wise %</CardDescription>
            </CardHeader>
            <CardContent>
              {student.progress && Object.keys(student.progress).length > 0 ? (
                Object.entries(student.progress).map(([subj, val]) => (
                  <div key={subj} className="mb-4">
                    <div className="flex justify-between mb-1">
                      <span>{subj}</span>
                      <span>{val}%</span>
                    </div>
                    <Progress value={val} />
                  </div>
                ))
              ) : (
                <p>No progress data.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scores</CardTitle>
              <CardDescription>Assignment/Test grades</CardDescription>
            </CardHeader>
            <CardContent>
              {student.grades.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Feedback</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {student.grades.map((g, i) => (
                      <TableRow key={i}>
                        <TableCell>{g.taskName}</TableCell>
                        <TableCell>{g.score}</TableCell>
                        <TableCell>{g.feedback}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p>No grades available.</p>
              )}
            </CardContent>
          </Card>
        </ScrollArea>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentManagerPage;
