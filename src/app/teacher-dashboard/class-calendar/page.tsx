"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/components/auth-provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ClassEvent {
  id: string;
  title: string;
  date: Date;
  description: string;
}

const ClassCalendarPage = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<ClassEvent[]>([]);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDescription, setNewEventDescription] = useState("");
  const { user, userClass } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState(userClass || ""); // Initialize with userClass
  const [classes, setClasses] = useState<string[]>(["Grade 8", "Grade 6", "Grade 4"]); // Static class options


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
          const eventsData = snapshot.docs.map(doc => ({
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
      });
      toast({
        title: 'Success',
        description: 'Event added to calendar.',
      });
      // Clear input fields
      setNewEventTitle("");
      setNewEventDescription("");
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
            <Select onValueChange={setSelectedClass} defaultValue={userClass? userClass:undefined}>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event-title">Event Title</Label>
              <Input
                id="event-title"
                type="text"
                placeholder="Enter event title"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="event-description">Event Description</Label>
              <Input
                id="event-description"
                type="text"
                placeholder="Enter event description"
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleAddEvent}>Add Event</Button>

          {/* Display Events for Selected Date */}
          <div className="mt-4">
            <h3 className="text-xl font-semibold">Events on {selectedDate ? format(selectedDate, "PPP") : "Select a date"}</h3>
            {isLoading && <p>Loading events...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {!isLoading && events.length === 0 && <p>No events scheduled for this date.</p>}
            {!isLoading && events.length > 0 && (
              <ul>
                {events.map(event => (
                  <li key={event.id} className="py-2 border-b">
                    <h4 className="font-semibold">{event.title}</h4>
                    <p className="text-sm text-muted-foreground">{event.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassCalendarPage;

import { Calendar as CalendarIcon } from "lucide-react"
