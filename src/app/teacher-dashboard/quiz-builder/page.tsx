"use client";

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  generateMCQ,
  GenerateMCQOutput,
} from '@/ai/flows/generate-mcq';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/components/auth-provider";
import { assignMCQ } from "@/ai/flows/assign-mcq";

const QuizBuilderPage = () => {
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [mcq, setMcq] = useState<GenerateMCQOutput | null>(null);
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
      const result = await generateMCQ({ topic, numQuestions });
      setMcq(result);
      toast({
        title: 'MCQs Generated',
        description: 'The MCQs have been generated.',
      });
    } catch (e: any) {
      setError(e.message || 'An error occurred while generating MCQs.');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to generate MCQs. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async () => {
    setIsAssigning(true);
    setError(null);
    try {
      if (!mcq) {
        setError("No MCQs generated to assign.");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please generate MCQs first.",
        });
        return;
      }

      if (!selectedClass) {
        setError("Please select a class to assign the MCQs to.");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please select a class.",
        });
        return;
      }
      const mcqData = JSON.stringify(mcq);
      const result = await assignMCQ({ classId: selectedClass, mcqData });
      if (result.success) {
        toast({
          title: "MCQs Assigned",
          description: result.message,
        });
      } else {
        setError(result.message || "Failed to assign MCQs.");
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || "Failed to assign MCQs.",
        });
      }
    } catch (e: any) {
      setError(e.message || "An error occurred while assigning MCQs.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to assign MCQs. Please try again.",
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
            Enter a topic and the number of MCQs to generate.
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
            <Label htmlFor="numQuestions">Number of MCQs</Label>
            <Input
              id="numQuestions"
              type="number"
              placeholder="Number of MCQs to generate"
              value={numQuestions.toString()}
              onChange={e => setNumQuestions(parseInt(e.target.value))}
            />
          </div>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Generating MCQs...' : 'Generate MCQs'}
          </Button>
          {error && <p className="text-red-500">{error}</p>}
          {mcq && mcq.questions && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold tracking-tight">
                Generated MCQs
              </h2>
              <p className="text-sm text-muted-foreground">
                Here are your AI generated MCQs on the topic of {topic}
              </p>
              <div className="grid gap-4 mt-4">
                {mcq.questions.map((q, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle>Question {index + 1}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="font-bold">{q.question}</p>
                      <ul>
                        {q.options.map((option, i) => (
                          <li key={i}>{option}</li>
                        ))}
                      </ul>
                      <p className="mt-2">Correct Answer: {q.correctAnswer}</p>
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
                {isAssigning ? "Assigning MCQs..." : "Assign MCQs to Class"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuizBuilderPage;
