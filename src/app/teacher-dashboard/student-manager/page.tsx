"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  onSnapshot, // Import onSnapshot for real-time updates
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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress as UiProgress } from "@/components/ui/progress"; // Renamed Progress import
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type Student = {
  id: string;
  email: string;
  class: string;
  studentNumber: string;
  role: string;
  lastMessage?: string;
  progress?: Record<string, number>;
  overallProgress?: number;
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [classes] = useState<string[]>([
    "Grade 1", "Grade 2", "Grade 3", "Grade 4",
    "Grade 5", "Grade 6", "Grade 7", "Grade 8"
  ]);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);

  // Listen for students in the selected class using onSnapshot for real-time updates
  useEffect(() => {
    if (!user || !db || !selectedClass) {
        setStudents([]); // Clear students if no user, db, or class selected
        setIsLoading(false);
        setError(selectedClass ? "Could not initialize Firestore." : null); // Show error only if class was selected but db failed
        return;
    }

    setIsLoading(true);
    setError(null);

    console.log(`Setting up real-time listener for class: ${selectedClass}`);

    const q = query(
      collection(db, "Users"),
      where("class", "==", selectedClass),
      where("role", "==", "student")
    );

    // Use onSnapshot for real-time updates
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log(`Received snapshot update with ${snapshot.size} students for class ${selectedClass}`);
        const data = snapshot.docs.map((d) => {
          const docData = d.data() as DocumentData;
          let overallProgress = 0;
          const progressData = docData.progress as Record<string, number> | undefined;
          if (progressData && Object.keys(progressData).length > 0) {
            const scores = Object.values(progressData);
            const validScores = scores.filter(s => typeof s === 'number' && !isNaN(s));
            if (validScores.length > 0) {
              overallProgress = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
            }
          }

          return {
            id: d.id,
            email: docData.email || 'N/A',
            class: docData.class || 'N/A',
            studentNumber: docData.studentNumber || 'N/A',
            role: docData.role || 'student',
            lastMessage: docData.lastMessage,
            progress: progressData ?? {},
            overallProgress: overallProgress,
          } as Student;
        });
        setStudents(data);
        setIsLoading(false);
      },
      (e) => {
        console.error("Error fetching students in real-time:", e);
        setError(e.message || "Failed to fetch students.");
        setIsLoading(false);
        setStudents([]); // Clear students on error
      }
    );

    // Cleanup function to unsubscribe when component unmounts or dependencies change
    return () => {
       console.log("Unsubscribing from student listener for class:", selectedClass);
       unsubscribe();
    };
  }, [user, selectedClass]); // Dependency array includes user and selectedClass


  // View detailed student info + grades (remains the same, uses getDoc, not real-time for details)
  const handleViewDetails = useCallback(async (studentId: string) => {
    if (!user || !db) return;
    // Using a local loading state for the dialog might be better
    // setIsLoading(true);
    setError(null);

    try {
      const studentRef = doc(db, "Users", studentId);
      const snap = await getDoc(studentRef);
      if (!snap.exists()) throw new Error("Student not found.");

      const data = snap.data() as DocumentData;

      const gradesSnap = await getDocs(collection(studentRef, "grades"));
      const grades: Grade[] = gradesSnap.docs.map((g) => {
        const gd = g.data() as DocumentData;
        return {
          taskName: gd.taskName || 'Untitled Task',
          score: Number(gd.score ?? 0),
          feedback: gd.feedback || '',
        };
      });

       let overallProgress = 0;
       const progressData = data.progress as Record<string, number> | undefined;
        if (progressData && Object.keys(progressData).length > 0) {
            const scores = Object.values(progressData);
            const validScores = scores.filter(s => typeof s === 'number' && !isNaN(s));
            if (validScores.length > 0) {
              overallProgress = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
            }
        }

      setSelectedStudent({
        id: studentId,
        email: data.email || 'N/A',
        class: data.class || 'N/A',
        studentNumber: data.studentNumber || 'N/A',
        role: data.role || 'student',
        lastMessage: data.lastMessage,
        progress: progressData ?? {},
        overallProgress: overallProgress, // Include overall progress in details
        grades,
      });
    } catch (e: any) {
      setError(e.message);
      toast({ variant: "destructive", title: "Error", description: e.message });
      setSelectedStudent(null);
    } finally {
     // setIsLoading(false);
    }
  }, [user, toast]); // Keep dependencies minimal for useCallback


  // Update a single subject’s progress
  const handleUpdateProgress = useCallback(async (
    studentId: string,
    subject: string,
    newProgress: number
  ) => {
    if (!db) return;
    try {
      const studentRef = doc(db, "Users", studentId);
      // Use dot notation to update a specific field within the 'progress' map
      await updateDoc(studentRef, {
        [`progress.${subject}`]: newProgress,
      });

      // No need to update local state manually here, onSnapshot will handle it.
      // If immediate feedback is desired before snapshot updates, you could still update locally,
      // but be mindful of potential brief inconsistencies.

       // Re-calculate and update overall progress if needed (or let snapshot handle it)
       // This might be slightly delayed if relying solely on snapshot
       /*
       if (selectedStudent && selectedStudent.id === studentId) {
         setSelectedStudent(prev => {
           if (!prev) return null;
           const updatedProgress = { ...(prev.progress ?? {}), [subject]: newProgress };
           const scores = Object.values(updatedProgress);
           const validScores = scores.filter(s => typeof s === 'number' && !isNaN(s));
           const newOverall = validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : 0;
           return { ...prev, progress: updatedProgress, overallProgress: newOverall };
         });
       }
       */

      toast({
        title: "Progress Updated",
        description: `${subject} set to ${newProgress}%`,
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error updating progress", description: e.message });
    }
  }, [toast]); // db dependency removed as it should be stable


  // “Send” a message by writing lastMessage
  const handleSendMessage = useCallback(async (studentId: string, message: string) => {
    if (!db) return;
    try {
      const studentRef = doc(db, "Users", studentId);
      await updateDoc(studentRef, { lastMessage: message });

      // onSnapshot will update the main list, but update dialog if open
      if (selectedStudent && selectedStudent.id === studentId) {
        setSelectedStudent(prev => prev ? ({ ...prev, lastMessage: message }) : null);
      }
      toast({ title: "Message Sent", description: message });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error sending message", description: e.message });
    }
  }, [selectedStudent, toast]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Student Manager</h1>
      <p className="text-gray-600 mb-6">Manage your students’ profiles and progress.</p>

      {/* Class selector */}
      <div className="grid gap-2 mb-6 max-w-sm">
        <Label htmlFor="class">Select Class</Label>
        <Select
          value={selectedClass} // Control the Select component with state
          onValueChange={setSelectedClass} // Update state when selection changes
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

      {/* Loading State */}
      {isLoading && <p className="text-center py-8">Loading students...</p>}

      {/* Error State */}
      {error && <p className="text-red-500 text-center py-8">{error}</p>}

      {/* No Students Found State */}
      {!isLoading && !error && students.length === 0 && selectedClass && (
        <p className="text-center text-gray-500 py-8">No students found in {selectedClass}.</p>
      )}

      {/* Prompt to Select Class State */}
      {!isLoading && !error && !selectedClass && (
        <p className="text-center text-gray-500 py-8">Please select a class to view students.</p>
      )}


      {/* Student Cards Grid - Render only if not loading, no error, and students exist */}
      {!isLoading && !error && students.length > 0 && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {students.map((s) => (
             <Card key={s.id} className="shadow-sm hover:shadow-md transition-shadow border border-gray-200 flex flex-col">
               <CardHeader>
                 <CardTitle className="text-lg">{s.email}</CardTitle>
                 <CardDescription>
                   Student #: {s.studentNumber || 'N/A'} | Class: {s.class}
                 </CardDescription>
               </CardHeader>
               <CardContent className="flex flex-col gap-4 flex-grow">
                {/* Display Overall Progress First */}
                 <div className="mb-2"> {/* Reduced margin */}
                     <div className="flex justify-between mb-1 text-sm font-medium">
                       <span>Overall Progress</span>
                       {/* Ensure overallProgress is calculated and displayed */}
                       <span>{s.overallProgress !== undefined ? `${s.overallProgress.toFixed(1)}%` : 'N/A'}</span>
                     </div>
                      <UiProgress value={s.overallProgress !== undefined ? s.overallProgress : 0} className="h-2"/>
                   </div>
                 <Separator /> {/* Separator */}

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
      )}


      {/* Details Dialog */}
      <StudentDetailsDialog
        student={selectedStudent}
        // Pass a different loading state if you implement one for details
        isLoading={false} // Assuming details loading is handled differently or is quick
        error={null} // Assuming details error is handled differently
        onClose={() => setSelectedStudent(null)}
        onUpdateProgress={handleUpdateProgress} // Pass down update handler
      />
    </div>
  );
};

// --- Edit Progress Dialog ---
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
  const [progress, setProgress] = useState(0); // Initialize to 0
  const [isSaving, setIsSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // Control dialog visibility

   // Effect to update progress input when subject changes OR dialog opens
   useEffect(() => {
      if (isOpen) { // Only update when dialog is open
         setProgress(currentProgress[subject] || 0);
      }
   }, [currentProgress, subject, isOpen]);


   const handleSave = async () => {
       setIsSaving(true);
       await onUpdateProgress(studentId, subject, progress);
       setIsSaving(false);
       setIsOpen(false); // Close the dialog after saving
   };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}> {/* Open dialog on click */}
          <Icons.edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {subject} Progress for {studentId}</DialogTitle> {/* Optional: Add student ID/name */}
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
              value={subject} // Control Select value
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
           <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button> {/* Close dialog */}
          <Button onClick={handleSave} disabled={isSaving}>
             {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


// --- Send Message Dialog ---
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
  const [isOpen, setIsOpen] = useState(false); // Control dialog state

  const handleSend = async () => {
      if (!message.trim()) return; // Prevent sending empty messages
      setIsSending(true);
      await onSendMessage(studentId, message);
      setIsSending(false);
      setMessage(""); // Clear message after sending
      setIsOpen(false); // Close the dialog
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}> {/* Open dialog */}
          <Icons.messageSquare className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Message to {studentId}</DialogTitle> {/* Optional: Add student ID/name */}
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
          <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button> {/* Close dialog */}
          <Button onClick={handleSend} disabled={isSending || !message.trim()}>
            {isSending ? "Sending..." : "Send Message"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


// --- Details Dialog ---
interface StudentDetailsDialogProps {
  student: StudentDetails | null;
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
  onUpdateProgress: (studentId: string, subject: string, newProgress: number) => void;
}
const StudentDetailsDialog: React.FC<StudentDetailsDialogProps> = ({
  student,
  isLoading: isDetailsLoading,
  error: detailsError,
  onClose,
  onUpdateProgress,
}) => {
  if (!student) return null;

  return (
    <Dialog open={!!student} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{student.email} Details</DialogTitle>
          <DialogDescription>
            View and manage this student’s records.
          </DialogDescription>
        </DialogHeader>
         {isDetailsLoading && <p className="text-center py-4">Loading details...</p>}
         {detailsError && <p className="text-red-500 text-center py-4">Error: {detailsError}</p>}

         {!isDetailsLoading && !detailsError && student && (
           <ScrollArea className="max-h-[60vh]">
               <div className="space-y-6 p-4">
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
                           <UiProgress value={val} className="h-2" />
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
                     {student.grades.length > 0 ? (
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
        )}

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
