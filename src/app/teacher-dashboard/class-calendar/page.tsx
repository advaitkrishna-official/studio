'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";//
import { format, isSameDay } from "date-fns"; // Import isSameDay
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, where, deleteDoc, doc, serverTimestamp, Timestamp } from "firebase/firestore";//
import { useAuth } from "@/components/auth-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { assignTask } from '@/ai/flows/assign-task'; // Import assignTask
import { Progress } from "@/components/ui/progress"; // Import Progress
import { motion } from 'framer-motion'; // Import motion
import type { DayContentProps } from 'react-day-picker'; // Import DayContentProps type


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
  const [classes, setClasses] = useState<string[]>([
    "Grade 1", "Grade 2", "Grade 3", "Grade 4",
    "Grade 5", "Grade 6", "Grade 7", "Grade 8"
  ]); // Static class options
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState("Grade 8"); // Default or derive from selectedClass
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false); // New state for task modal
  const [newTaskTitle, setNewTaskTitle] = useState(""); // New state for task title
  const [newTaskDescription, setNewTaskDescription] = useState(""); // New state for task description
  const [newTaskDueDate, setNewTaskDueDate] = useState<Date | undefined>(new Date()); // New state for task due date
  const { toast } = useToast();

  // Update selectedGrade when selectedClass changes
  useEffect(() => {
    if (selectedClass) {
      const gradeNum = selectedClass.split(" ")[1];
      if (gradeNum) {
        setSelectedGrade(`grade-${gradeNum}`);
      }
    }
  }, [selectedClass]);


  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!user) {
          setError("User not logged in.");
          return;
        }
         if (!selectedClass) {
           setError("Please select a class.");
           setIsLoading(false); // Stop loading if no class is selected
           setEvents([]); // Clear events
           return;
         }

        console.log(`Fetching events for class: ${selectedClass}`); // Debug log

        // Listen for new events in Firestore
        const eventsCollection = collection(db, 'classes', selectedClass, 'events');
        // Removed date filter to fetch all events for the class
        const q = query(eventsCollection); // Fetch all events for the selected class

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const eventsData = snapshot.docs.map((doc) => {
             const data = doc.data();
             let eventDate: Date | null = null;
             if (data.date instanceof Timestamp) {
                eventDate = data.date.toDate();
             } else if (data.date?.seconds) { // Handle object Timestamps if necessary
                eventDate = new Timestamp(data.date.seconds, data.date.nanoseconds).toDate();
             }

             return {
              id: doc.id,
              ...(data as any),
              date: eventDate, // Use the converted date
             } as ClassEvent;
          }).filter(event => event.date); // Filter out events with invalid dates

          console.log("Fetched events data:", eventsData); // Debug log
          setEvents(eventsData);
          setIsLoading(false);
        }, (error) => {
           console.error("Error fetching events:", error);
           setError(error.message || "An error occurred while fetching events.");
           setIsLoading(false);
        });

        return () => unsubscribe();
      } catch (e: any) {
        setError(e.message || "An error occurred while fetching events.");
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [user, selectedClass]); // Re-fetch when user or selectedClass changes

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

      if (!newEventTitle || !newEventDescription || !selectedDate) { // Check selectedDate too
        setError("Please enter event title, description, and select a date.");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please enter event title, description, and select a date.",
        });
        return;
      }

      const eventsCollection = collection(db, 'classes', selectedClass, 'events');
      await addDoc(eventsCollection, {
        title: newEventTitle,
        date: Timestamp.fromDate(selectedDate), // Convert JS Date to Firestore Timestamp
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

      // The real-time listener will automatically update the local state
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
        setError("Please enter all task details including a due date.");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please enter all task details including a due date.",
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

      setIsLoading(true); // Indicate loading state

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
        // Add the task as an event to the calendar
        const eventsCollection = collection(db, 'classes', selectedClass, 'events');
        await addDoc(eventsCollection, {
          title: `Task Due: ${newTaskTitle}`,
          date: Timestamp.fromDate(newTaskDueDate), // Use the due date for the calendar event
          description: `Assignment: ${newTaskDescription}`,
          type: 'task',
        });
        // Clear input fields
        setNewTaskTitle("");
        setNewTaskDescription("");
        setNewTaskDueDate(new Date()); // Reset to today's date
        setIsAddTaskModalOpen(false); // Close the modal
      } else {
        setError(result.message || "Failed to assign task.");
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to assign task.",
        });
      }


    } catch (error: any) {
      console.error("Error assigning task:", error);
      setError(error.message || "An error occurred while assigning the task.");
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to assign task: ${error.message}`,
      });
    } finally {
      setIsLoading(false); // Stop loading state
    }
  };

  // ---- Animated Calendar Components ----
  const eventDates = events.map(event => event.date);

  const AnimatedDayContent = (props: DayContentProps) => {
    const hasEvent = eventDates.some(eventDate => isSameDay(props.date, eventDate));
    return (
      <div className="relative flex flex-col items-center justify-center h-full">
        <span>{format(props.date, 'd')}</span>
        {hasEvent && (
          <motion.div
            className="absolute bottom-1 w-1.5 h-1.5 bg-indigo-500 rounded-full"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}
      </div>
    );
  };
  // --- End Animated Calendar Components ---

  const eventsForSelectedDate = selectedDate
    ? events.filter(event => isSameDay(event.date, selectedDate))
    : [];

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
            <Select onValueChange={(value: string) => setSelectedClass(value)} value={selectedClass}>
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

          {/* Calendar */}
          <div className="rounded-md border p-4 flex flex-col items-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              // Removed disabled dates to allow viewing past events
              initialFocus
              className="w-full max-w-md" // Ensure calendar takes space
              components={{ DayContent: AnimatedDayContent }} // Use custom component
              modifiers={{
                hasEvent: eventDates, // Modifier to potentially style dates with events
              }}
              modifiersClassNames={{
                hasEvent: 'font-bold', // Example: make dates with events bold (needs Tailwind/CSS)
              }}
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setIsAddEventModalOpen(true)} disabled={!selectedDate}>Add Event</Button>
            <Button onClick={() => setIsAddTaskModalOpen(true)} disabled={!selectedDate}>Assign Task</Button>
          </div>

          {/* Display Events for Selected Date */}
          <div className="mt-4">
            <h3 className="text-xl font-semibold">Events on {selectedDate ? format(selectedDate, "PPP") : "Select a date"}</h3>
            {isLoading && <p>Loading events...</p>}
            {error && !isLoading && <p className="text-red-500">{error}</p>}
            {!isLoading && eventsForSelectedDate.length === 0 && selectedDate && <p>No events scheduled for this date.</p>}
            {!isLoading && eventsForSelectedDate.length > 0 && (
              <ul className="space-y-2 mt-2">
                {eventsForSelectedDate.map(event => (
                  <li key={event.id} className="py-2 px-3 border rounded-md flex items-center justify-between bg-muted/50 shadow-sm">
                    <div>
                      <h4 className={`font-semibold ${event.type === 'task' ? 'text-blue-600' : ''}`}>{event.title}</h4>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteEvent(event.id)} className="text-destructive hover:bg-destructive/10">
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
            <DialogTitle>Add New Event for {selectedDate ? format(selectedDate, "PPP") : ""}</DialogTitle>
            <DialogDescription>Schedule a class event or announcement.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 py-4">
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
            <DialogDescription>Assign a task to the students in {selectedClass}.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-4 py-4">
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
              {/* Popover for selecting due date */}
               <Popover>
                 <PopoverTrigger asChild>
                   <Button
                     variant={"outline"}
                     className={cn(
                       "w-full justify-start text-left font-normal",
                       !newTaskDueDate && "text-muted-foreground"
                     )}
                   >
                     <CalendarIcon className="mr-2 h-4 w-4" />
                     {newTaskDueDate ? format(newTaskDueDate, "PPP") : <span>Pick a due date</span>}
                   </Button>
                 </PopoverTrigger>
                 <PopoverContent className="w-auto p-0">
                   <Calendar
                     mode="single"
                     selected={newTaskDueDate}
                     onSelect={setNewTaskDueDate}
                     initialFocus
                     // Optionally disable past dates for due date
                     disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                   />
                 </PopoverContent>
               </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsAddTaskModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" onClick={handleAssignTask} disabled={isLoading}>
               {isLoading ? 'Assigning...' : 'Assign Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClassCalendarPage;
    