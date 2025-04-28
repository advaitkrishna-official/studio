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
import {
  generateMCQ,
  GenerateMCQOutput,
} from '@/ai/flows/generate-mcq';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/components/auth-provider";
import {
  assignMCQ,
  AssignMCQInput,
  AssignMCQOutput,
} from "@/ai/flows/assign-mcq";
import { GenerateQuizInput } from "@/ai/flows/generate-quiz";

import { generateQuiz, GenerateQuizOutput } from '@/ai/flows/generate-quiz';
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";

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
  const [classes, setClasses] = useState<string[]>(["Grade 8", "Grade 6", "Grade 4"]); // Static class options

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
    setIsAssigning(true);
    setError(null);
    try {
      if (!quiz) {
        setError("No Quiz generated to assign.");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please generate Quiz first.",
        });
        return;
      }

      if (!selectedClass) {
        setError("Please select a class to assign the Quiz to.");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please select a class.",
        });
        return;
      }

      // Fetch student IDs for the selected class
      const studentsQuery = query(collection(db, "users"), where("class", "==", selectedClass), where("role", "==", "student"));
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentIds = studentsSnapshot.docs.map(doc => doc.id);
        
      if (studentIds.length === 0) {
           setError("No students found in the selected class.");
            toast({
              variant: "destructive",
              title: "Error",
              description: "No students found in the selected class.",
            });
            return;
      }


      const quizData = JSON.stringify(quiz);
      const result = await assignMCQ({
        classId: selectedClass,
        mcqData: quizData,
        grade: selectedClass,
      });
      if (result.success) {
        toast({
          title: "Quiz Assigned",
          description: result.message,
        });
      } else {
        setError(result.message || "Failed to assign Quiz.");
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to assign Quiz.",
        });
      }
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

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Quiz Builder</CardTitle>
          <CardDescription>
            Enter a topic and the number of Quiz to generate.
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
            <Label htmlFor="numQuestions">Number of Quizs</Label>
            <Input
              id="numQuestions"
              type="number"
              placeholder="Number of Quizs to generate"
              value={numQuestions.toString()}
              onChange={e => setNumQuestions(parseInt(e.target.value))}
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
            {isLoading ? 'Generating Quizs...' : 'Generate Quizs'}
          </Button>
          {error && <p className="text-red-500">{error}</p>}
          {quiz && quiz.questions && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold tracking-tight">
                Generated Quizs
              </h2>
              <p className="text-sm text-muted-foreground">
                Here are your AI generated Quizs on the topic of {topic}
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
              <Button onClick={handleAssign} disabled={isAssigning || !selectedClass}>
                {isAssigning ? "Assigning Quizs..." : "Assign Quizs to Class"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuizBuilderPage;
