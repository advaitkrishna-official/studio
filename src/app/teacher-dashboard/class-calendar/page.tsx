'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";//
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc, serverTimestamp } from "firebase/firestore";//
import { useAuth } from "@/components/auth-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { assignTask } from '@/ai/flows/assign-task'; // Import assignTask
import { Progress } from "@/components/ui/progress";

interface ClassEvent {
  id: string;
  title: string;
  date: Date;
  description: string;
  type: 'event' | 'task';
}

const ClassCalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<ClassEvent[]>([]);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const { user, userClass } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState(userClass || ""); // Initialize with userClass
  const [classes, setClasses] = useState<string[]>(["Grade 8", "Grade 6", "Grade 4"]); // Static class options
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState("grade-8");
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false); // New state for task modal
  const [newTaskTitle, setNewTaskTitle] = useState(""); // New state for task title
  const [newTaskDescription, setNewTaskDescription] = useState(""); // New state for task description
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(new Date()); // New state for task due date
  const { toast } = useToast();


  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!user) {
          setError("User not logged in.");
          return;
        }

        // Listen for new events in Firestore
        const eventsCollection = collection(db, 'classes', selectedClass, 'events');
        const q = query(eventsCollection, where("date", ">=", selectedDate));

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const eventsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as any),
            date: (doc.data() as any).date.toDate(), // Convert Firebase Timestamp to JavaScript Date
          })) as ClassEvent[];
          setEvents(eventsData);
        });

        return () => unsubscribe();
      } catch (e: any) {
        setError(e.message || "An error occurred while fetching events.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [user, selectedDate, selectedClass]);

  const handleAddEvent = async () => {
    try {
      if (!user) {
        setError("User not logged in.");
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to add events.",
        });
        return;
      }

      if (!newEventTitle || !newEventDescription) {
        setError("Please enter event title and description.");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please enter event title and description.",
        });
        return;
      }

      const eventsCollection = collection(db, 'classes', selectedClass, 'events');
      await addDoc(eventsCollection, {
        title: newEventTitle,
        date: selectedDate,
        description: newEventDescription,
        type: 'event',
      });
      toast({
        title: 'Success',
        description: 'Event added to calendar.',
      });
      // Clear input fields
      setNewEventTitle("");
      setNewEventDescription("");
      setIsAddEventModalOpen(false); // Close the modal
    } catch (error: any) {
      console.error("Error adding event:", error);
      setError(error.message || "An error occurred while adding the event.");
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to add event: ${error.message}`,
      });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const eventDocRef = doc(db, 'classes', selectedClass, 'events', eventId);
      await deleteDoc(eventDocRef);

      toast({
        title: 'Success',
        description: 'Event deleted from calendar.',
      });

      // Update local state
      setEvents(events => events.filter(event => event.id !== eventId));
    } catch (error: any) {
      console.error("Error deleting event:", error);
      setError(error.message || "An error occurred while deleting the event.");
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to delete event: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignTask = async () => {
    try {
      if (!user) {
        setError("User not logged in.");
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to assign tasks.",
        });
        return;
      }

      if (!newTaskTitle || !newTaskDescription || !newTaskDueDate) {
        setError("Please enter all task details.");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please enter all task details.",
        });
        return;
      }

      const taskDetails = JSON.stringify({
        title: newTaskTitle,
        description: newTaskDescription,
        dueDate: newTaskDueDate.toISOString(),
      });

      const teacherId = user.uid; // Assuming user object has a uid property
      const assignmentTitle = newTaskTitle || "Untitled Task"; // Use the task title or a default

      const result = await assignTask({
        classId: selectedClass,
        taskDetails: taskDetails,
        grade: selectedGrade, teacherId, assignmentTitle
      });

      if (result.success) {
        toast({
          title: 'Success',
          description: result.message,
        });
      } else {
        setError(result.message || "Failed to assign task.");
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to assign task.",
        });
        return;
      }

      const eventsCollection = collection(db, 'classes', selectedClass, 'events');
      await addDoc(eventsCollection, {
        title: newTaskTitle,
        date: selectedDate,
        description: newTaskDescription,
        type: 'task',
      });

      // Clear input fields
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskDueDate(new Date()); // Reset to today's date
      setIsAddTaskModalOpen(false); // Close the modal
    } catch (error: any) {
      console.error("Error assigning task:", error);
      setError(error.message || "An error occurred while assigning the task.");
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to assign task: ${error.message}`,
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Class Calendar</CardTitle>
          <CardDescription>Schedule classes, assignments, and sync with student dashboards.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">

          {/* Class Selection Dropdown */}
          <div className="grid gap-2">
            <Label htmlFor="class">Select Class</Label>
            <Select onValueChange={(value: string) => {setSelectedClass(value);setSelectedGrade("grade-" + value.split(" ")[1])}} defaultValue={userClass? userClass:undefined}>
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
          
          <div className="rounded-md border">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) =>
                    date < new Date()
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setIsAddEventModalOpen(true)}>Add Event</Button>
            <Button onClick={() => setIsAddTaskModalOpen(true)}>Assign Task</Button>
          </div>

          {/* Display Events for Selected Date */}
          <div className="mt-4">
            <h3 className="text-xl font-semibold">Events on {selectedDate ? format(selectedDate, "PPP") : "Select a date"}</h3>
            {isLoading && <p>Loading events...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!isLoading && events.length === 0 && <p>No events scheduled for this date.</p>}
            {!isLoading && events.length > 0 && (
              <ul>
                {events.map(event => (
                  <li key={event.id} className="py-2 border-b flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{event.title}</h4>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteEvent(event.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Event Modal */}
      <Dialog open={isAddEventModalOpen} onOpenChange={setIsAddEventModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Event</DialogTitle>
            <DialogDescription>Schedule a class, assignment, or announcement for your students.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="event-title">Event Title</Label>
              <Input
                id="event-title"
                type="text"
                placeholder="Enter event title"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="event-description">Event Description</Label>
              <Textarea
                id="event-description"
                placeholder="Enter event description"
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsAddEventModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleAddEvent}>Add Event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Task Modal */}
      <Dialog open={isAddTaskModalOpen} onOpenChange={setIsAddTaskModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign New Task</DialogTitle>
            <DialogDescription>Assign a task to the students in the selected class.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="task-title">Task Title</Label>
              <Input
                id="task-title"
                type="text"
                placeholder="Enter task title"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-description">Task Description</Label>
              <Textarea
                id="task-description"
                placeholder="Enter task description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="task-due-date">Due Date</Label>
              <Input
                id="task-due-date"
                type="date"
                value={newTaskDueDate ? format(newTaskDueDate, "yyyy-MM-dd") : ""}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewTaskDueDate(new Date(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsAddTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleAssignTask}>Assign Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassCalendarPage;
