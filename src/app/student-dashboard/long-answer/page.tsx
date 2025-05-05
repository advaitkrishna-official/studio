// src/app/student-dashboard/long-answer/page.tsx
"use client";

import { useState, useEffect } from "react";

// Auth & Toast
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";

// AI Flows
import {
  generateLongAnswerQuestions,
  GenerateLongAnswerQuestionsOutput,
} from "@/ai/flows/generate-long-answer-questions";
import { checkLongAnswer, CheckLongAnswerOutput } from "@/ai/flows/check-long-answer";

// Firebase helpers
import { saveGrade, getGrades } from "@/lib/firebase";

// UI Components
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type GradeData = {
  id: string;
  taskName: string;
  score: number;
  feedback: string;
  timestamp: Date;
}

const LongAnswerPage = () => {
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(1);
  const [questions, setQuestions] = useState<GenerateLongAnswerQuestionsOutput | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<CheckLongAnswerOutput[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, userClass } = useAuth(); // Get userClass (student's grade)
  const { toast } = useToast();
  const [totalScore, setTotalScore] = useState<number | null>(null);

  // Fetch total score
  useEffect(() => {
      if (user) {
          getGrades(user.uid)
              .then((grades) => {
                  const typedGrades = grades as GradeData[]; // Explicitly type grades
                  if (typedGrades.length > 0) {
                    // Filter for long answer scores if needed, or calculate total
                    // Example: Just summing all scores for now
                     const sum = typedGrades.reduce((acc, grade) => acc + (grade.score || 0), 0); // Handle potential undefined score
                     setTotalScore(sum);
                  } else {
                    setTotalScore(0); // Set to 0 if no grades exist
                  }
              })
              .catch((e: any) => {
                  console.error("Error fetching grades:", e);
                  setError(e.message || "An error occurred while fetching grades.");
              });
      }
  }, [user]);


  const handleGenerate = async () => {
    if (!userClass) {
        setError("Student grade not found.");
        toast({ variant: 'destructive', title: 'Error', description: 'Student grade not found.' });
        return;
    }
    setIsLoading(true);
    setError(null);
    setQuestions(null); // Reset previous questions
    setAnswers([]);
    setFeedback(null);
    try {
       // Pass the student's grade from userClass
      const result = await generateLongAnswerQuestions({ topic, numQuestions, grade: userClass });
      setQuestions(result);
      setAnswers(Array(result.questions.length).fill(""));
      toast({ title: 'Questions Generated' });
    } catch (e: any) {
      setError(e.message);
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers((prev) => {
      const newAnswers = [...prev];
      newAnswers[index] = value;
      return newAnswers;
    });
  };

  const handleSubmitAnswers = async () => {
    if (!questions || !userClass || !user) return; // Need questions, grade, and user

    setIsChecking(true);
    setError(null);
    setFeedback(null); // Reset previous feedback

    try {
      const feedbackResults: CheckLongAnswerOutput[] = [];
      let totalPoints = 0; // Track points for scoring

      for (let i = 0; i < questions.questions.length; i++) {
        const result = await checkLongAnswer({
          question: questions.questions[i],
          studentAnswer: answers[i],
          keyPoints: questions.keyPoints, // Pass the key points for evaluation
          grade: userClass,
        });
        feedbackResults.push(result);
        if(result.isCorrect) {
            totalPoints += (100 / questions.questions.length); // Equally distribute points
        }
      }
      setFeedback(feedbackResults);
      toast({ title: 'Answers Submitted', description: `Score: ${totalPoints.toFixed(1)}%` });

      // Save the overall score for this set of long answer questions
      await saveGrade(user.uid, `Long Answer: ${topic}`, totalPoints, "See individual question feedback.");

       // Fetch updated total score
       getGrades(user.uid)
         .then((grades) => {
           const typedGrades = grades as GradeData[];
           if (typedGrades.length > 0) {
             const sum = typedGrades.reduce((acc, grade) => acc + (grade.score || 0), 0);
             setTotalScore(sum);
           } else {
             setTotalScore(0);
           }
         }).catch(console.error);


    } catch (e: any) {
      setError(e.message);
      toast({ variant: 'destructive', title: 'Error Checking Answers', description: e.message });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Long Answer Questions</CardTitle>
          <CardDescription>
            Generate long answer questions on a topic and get AI feedback on your answers.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {/* Input Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                placeholder="Enter topic..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="numQuestions">Number of Questions</Label>
              <Input
                id="numQuestions"
                type="number"
                placeholder="Number of questions"
                value={numQuestions.toString()}
                onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                min="1"
              />
            </div>
          </div>
          {/* Removed Grade Selector */}
          <Button onClick={handleGenerate} disabled={isLoading || !userClass}>
            {isLoading ? "Generating Questions..." : "Generate Questions"}
          </Button>
          {error && <p className="text-red-500">{error}</p>}
           {totalScore !== null && (
               <p className="text-right font-medium">Overall Long Answer Score: {totalScore.toFixed(1)}%</p>
            )}
        </CardContent>
      </Card>

      {/* Questions Section */}
      {questions && (
        <Card className="max-w-3xl mx-auto mt-8">
          <CardHeader>
            <CardTitle>Answer the Questions</CardTitle>
            <CardDescription>
              Provide your answers below. Key points for a good answer: {questions.keyPoints.join(", ")}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {questions.questions.map((q, index) => (
              <div key={index} className="grid gap-2">
                <Label htmlFor={`answer-${index}`} className="font-semibold">
                  Question {index + 1}: {q}
                </Label>
                <Textarea
                  id={`answer-${index}`}
                  placeholder="Type your answer here..."
                  value={answers[index]}
                  onChange={(e) => handleAnswerChange(index, e.target.value)}
                  disabled={!!feedback} // Disable after submission
                  rows={5}
                />
              </div>
            ))}
            {!feedback && ( // Only show submit button if feedback hasn't been generated
              <Button onClick={handleSubmitAnswers} disabled={isChecking}>
                {isChecking ? "Checking Answers..." : "Submit Answers"}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Feedback Section */}
      {feedback && (
        <Card className="max-w-3xl mx-auto mt-8">
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
            <CardDescription>AI feedback on your answers.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            {feedback.map((fb, index) => (
              <div key={index} className="p-4 border rounded-md bg-muted/50">
                <h3 className="font-semibold mb-2">Feedback for Question {index + 1}</h3>
                <p className={`mb-1 ${fb.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {fb.isCorrect ? "Correct!" : "Needs Improvement"}
                </p>
                <p className="text-sm mb-1"><strong>Provided Answer:</strong> {answers[index]}</p>
                <p className="text-sm mb-1"><strong>AI Feedback:</strong> {fb.feedback}</p>
                <p className="text-sm"><strong>Suggested Answer:</strong> {fb.correctAnswer}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LongAnswerPage;