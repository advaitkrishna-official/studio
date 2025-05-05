"use client";

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/components/auth-provider";
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { GenerateQuizInput } from "@/ai/flows/generate-quiz";
import { generateQuiz, GenerateQuizOutput } from '@/ai/flows/generate-quiz';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from "firebase/firestore";

const QuizBuilderPage = () => {
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("Medium");
  const [questionType, setQuestionType] = useState("MCQ");
  const [quiz, setQuiz] = useState<GenerateQuizOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const {user, userClass} = useAuth();
  //Static class options
  const [classes, setClasses] = useState<string[]>(["Grade 1","Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8"]);
  const [dueDate, setDueDate] = useState<Date | undefined>(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // Default to one week from now


  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateQuiz({
        topic,
        numQuestions,
        difficulty,
        questionType: questionType as GenerateQuizInput["questionType"],
      });
      setQuiz(result);
      toast({
        title: 'Quiz Generated',
        description: 'The quiz has been generated.',
      });
    } catch (e: any) {
      setError(e.message || 'An error occurred while generating quiz.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate quiz. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      return;
    }
    if (!quiz) {
      setError("No Quiz generated to assign.");
      toast({ variant: "destructive", title: "Error", description: "Please generate Quiz first." });
      return;
    }
    if (!selectedClass) {
      setError("Please select a class to assign the Quiz to.");
      toast({ variant: "destructive", title: "Error", description: "Please select a class." });
      return;
    }
     if (!dueDate) {
       setError("Please select a due date.");
       toast({ variant: "destructive", title: "Error", description: "Please select a due date." });
       return;
     }

    setIsAssigning(true);
    setError(null);

    try {
      // Create assignment document in Firestore
      const assignmentData = {
        title: `Quiz: ${topic || 'Untitled'}`,
        description: `An AI-generated ${questionType} quiz on the topic of ${topic}.`,
        type: questionType as AssignmentType, // Cast to AssignmentType
        dueDate: dueDate,
        mcqQuestions: questionType === 'MCQ' ? quiz.questions : [],
        assignedTo: {
          classId: selectedClass,
          studentIds: [], // Assign to whole class, student IDs can be added later if needed
        },
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      };

      const assignmentsCollection = collection(db, 'assignments');
      await addDoc(assignmentsCollection, assignmentData);

      toast({
        title: "Quiz Assigned",
        description: `Quiz "${assignmentData.title}" assigned to ${selectedClass}.`,
        duration: 3000
      });

      // Optionally clear the generated quiz after assigning
      // setQuiz(null);
      // setTopic('');

    } catch (e: any) {
      setError(e.message || "An error occurred while assigning Quiz.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to assign Quiz. Please try again.",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  // Define AssignmentType locally if not imported
  type AssignmentType = 'Written' | 'MCQ' | 'Test' | 'Other' | 'True/False' | 'Fill in the Blanks' | 'Short Answer' | 'Long Answer' | 'Matching' | 'Code Output';


  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Quiz Builder</CardTitle>
          <CardDescription>
            Enter a topic and the number of Questions to generate.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              placeholder="Enter topic..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="numQuestions">Number of Questions</Label>
            <Input
              id="numQuestions"
              type="number"
              placeholder="Number of Questions to generate"
              value={numQuestions.toString()}
              onChange={e => setNumQuestions(parseInt(e.target.value))}
              min="1"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select onValueChange={setDifficulty} defaultValue={difficulty}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="questionType">Question Type</Label>
            <Select onValueChange={setQuestionType} defaultValue={questionType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select question type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MCQ">MCQ</SelectItem>
                <SelectItem value="True/False">True/False</SelectItem>
                <SelectItem value="Fill in the Blanks">Fill in the Blanks</SelectItem>
                <SelectItem value="Short Answer">Short Answer</SelectItem>
                <SelectItem value="Long Answer">Long Answer</SelectItem>
                <SelectItem value="Matching">Matching</SelectItem>
                <SelectItem value="Code Output">Code Output</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Generating Quiz...' : 'Generate Quiz'}
          </Button>
          {error && <p className="text-red-500">{error}</p>}
          {quiz && quiz.questions && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold tracking-tight">
                Generated Quiz
              </h2>
              <p className="text-sm text-muted-foreground">
                Here are your AI generated questions on the topic of {topic}
              </p>
              <div className="grid gap-4 mt-4">
                {quiz.questions.map((q, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle>Question {index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-bold">{q.question}</p>
                      {q.options && (
                        <ul>
                          {q.options.map((option, i) => (
                            <li key={i}>{option}</li>
                          ))}
                        </ul>
                      )}
                      {q.correctAnswer && (
                        <p className="mt-2">Correct Answer: {q.correctAnswer}</p>
                      )}
                      <p className="mt-2">Question Type: {q.questionType}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="grid gap-2 mt-6">
                <Label htmlFor="class">Assign to Class</Label>
                <Select onValueChange={setSelectedClass} value={selectedClass}>
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
               <div className="grid gap-2 mt-4">
                 <Label htmlFor="dueDate">Due Date</Label>
                 <Popover>
                   <PopoverTrigger asChild>
                     <Button
                       variant={"outline"}
                       className={cn(
                         "w-full justify-start text-left font-normal",
                         !dueDate && "text-muted-foreground"
                       )}
                     >
                       <CalendarIcon className="mr-2 h-4 w-4" />
                       {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                     </Button>
                   </PopoverTrigger>
                   <PopoverContent className="w-auto p-0">
                     <Calendar
                       mode="single"
                       selected={dueDate}
                       onSelect={setDueDate}
                       initialFocus
                     />
                   </PopoverContent>
                 </Popover>
               </div>
              <Button onClick={handleAssign} disabled={isAssigning || !selectedClass || !dueDate} className="mt-4">
                {isAssigning ? "Assigning Quiz..." : "Assign Quiz to Class"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuizBuilderPage;
