// src/app/student-dashboard/long-answer/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from 'framer-motion'; // For animations

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
import { saveGrade, getGrades, GradeData } from "@/lib/firebase"; // Import GradeData type

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
import { Badge } from "@/components/ui/badge"; // To display key points


const LongAnswerPage = () => {
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(1);
  const [questions, setQuestions] = useState<GenerateLongAnswerQuestionsOutput | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<CheckLongAnswerOutput[] | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For generating questions
  const [isChecking, setIsChecking] = useState(false); // For checking answers
  const [error, setError] = useState<string | null>(null);
  const { user, userClass, loading: authLoading } = useAuth(); // Get userClass (student's grade) and auth loading state
  const { toast } = useToast();
  const [longAnswerScore, setLongAnswerScore] = useState<number | null>(null); // Changed state name

  // Fetch long answer specific score on mount or when user changes
  useEffect(() => {
      if (user && !authLoading) { // Check authLoading is false
          setLongAnswerScore(null); // Reset score while fetching
          getGrades(user.uid)
              .then((grades) => {
                  const typedGrades = grades as GradeData[]; // Explicitly type grades
                  // Filter for long answer tasks
                  const longAnswerGrades = typedGrades.filter(grade =>
                    grade.taskName?.toLowerCase().includes('long answer')
                  );

                  if (longAnswerGrades.length > 0) {
                      // Calculate average score for long answer tasks
                      const sum = longAnswerGrades.reduce((acc, grade) => acc + (grade.score || 0), 0); // Handle potential undefined score
                      const avg = sum / longAnswerGrades.length;
                      setLongAnswerScore(Math.min(avg, 100)); // Use average and cap at 100
                  } else {
                    setLongAnswerScore(0); // Set to 0 if no long answer grades exist
                  }
              })
              .catch((e: any) => {
                  console.error("Error fetching grades:", e);
                  setError(e.message || "An error occurred while fetching grades.");
                  setLongAnswerScore(0); // Set to 0 on error
              });
      } else {
        setLongAnswerScore(null); // Clear score if no user or auth is loading
      }
  }, [user, authLoading]); // Rerun when user or authLoading changes


  const handleGenerate = async () => {
    if (authLoading) {
        toast({ variant: 'destructive', title: 'Loading', description: 'Please wait for user data.' });
        return;
    }
    if (!userClass) {
        setError("Student grade not found. Please log in again.");
        toast({ variant: 'destructive', title: 'Error', description: 'Student grade not found.' });
        return;
    }
     if (!topic.trim()) {
        setError("Please enter a topic.");
        toast({ variant: 'destructive', title: 'Error', description: 'Topic cannot be empty.' });
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
      if (!result || !result.questions || result.questions.length === 0) {
        setError("AI could not generate questions for this topic.");
        toast({ variant: 'destructive', title: 'Generation Failed', description: 'Try a different topic or number.' });
      } else {
        setQuestions(result);
        setAnswers(Array(result.questions.length).fill(""));
        toast({ title: 'Questions Generated' });
      }
    } catch (e: any) {
      console.error("Error generating long answer questions:", e);
      setError(e.message || "An error occurred during generation.");
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
    if (authLoading || !questions || !userClass || !user) {
        toast({ variant: 'destructive', title: 'Error', description: 'Cannot submit. Missing user data or questions.' });
        return;
    }
    if (answers.some(a => !a.trim())) {
        toast({ variant: 'destructive', title: 'Incomplete', description: 'Please answer all questions before submitting.' });
        return;
    }

    setIsChecking(true);
    setError(null);
    setFeedback(null); // Reset previous feedback

    try {
      const feedbackResults: CheckLongAnswerOutput[] = [];
      let correctCount = 0; // Track correct answers

      for (let i = 0; i < questions.questions.length; i++) {
        const result = await checkLongAnswer({
          question: questions.questions[i],
          studentAnswer: answers[i],
          keyPoints: questions.keyPoints, // Pass the key points for evaluation
          grade: userClass,
        });
        feedbackResults.push(result);
        if(result.isCorrect) {
            correctCount++; // Increment correct count
        }
      }
      const scorePercentage = (correctCount / questions.questions.length) * 100; // Calculate score

      setFeedback(feedbackResults);
      toast({ title: 'Answers Submitted', description: `Score: ${scorePercentage.toFixed(1)}%` });

      // Save the score for this specific long answer task
      await saveGrade(user.uid, `Long Answer: ${topic}`, scorePercentage, `${correctCount} of ${questions.questions.length} correct. See feedback.`);

       // Re-fetch long answer specific score to update display
       getGrades(user.uid)
         .then((grades) => {
           const typedGrades = grades as GradeData[];
           const longAnswerGrades = typedGrades.filter(grade =>
             grade.taskName?.toLowerCase().includes('long answer')
           );
           if (longAnswerGrades.length > 0) {
             const sum = longAnswerGrades.reduce((acc, grade) => acc + (grade.score || 0), 0);
             const avg = sum / longAnswerGrades.length;
             setLongAnswerScore(Math.min(avg, 100)); // Cap at 100
           } else {
             setLongAnswerScore(0);
           }
         }).catch(console.error);


    } catch (e: any) {
      console.error("Error checking long answers:", e);
      setError(e.message || "An error occurred while checking answers.");
      toast({ variant: 'destructive', title: 'Error Checking Answers', description: e.message });
    } finally {
      setIsChecking(false);
    }
  };

  // Disable generate button state
  const isGenerateDisabled = isLoading || authLoading || !userClass || !topic.trim();

  return (
    // Container and layout are handled by src/app/student-dashboard/layout.tsx
    <>
        <h1 className="text-3xl font-bold mb-4">Long Answer Practice</h1>
        <Card className="max-w-3xl mx-auto mb-8 shadow-lg border border-gray-200">
            <CardHeader>
                <CardTitle>Generate Questions</CardTitle>
                <CardDescription>
                    Generate long answer questions on a topic and get AI feedback on your answers.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                {/* Input Section */}
                <div className="grid gap-4 md:grid-cols-2 items-end">
                    <div className="grid gap-2">
                        <Label htmlFor="topic" className="font-medium">Topic</Label>
                        <Input
                            id="topic"
                            placeholder="e.g., The Water Cycle, Mitosis"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="numQuestions" className="font-medium">Number of Questions</Label>
                        <Input
                            id="numQuestions"
                            type="number"
                            placeholder="e.g., 3"
                            value={numQuestions.toString()}
                             onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value)))} // Ensure at least 1
                            min="1"
                             className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>
                     <div className="md:col-span-2">
                        <Button onClick={handleGenerate} disabled={isGenerateDisabled} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3">
                            {isLoading ? "Generating Questions..." : "Generate Questions"}
                        </Button>
                     </div>
                </div>
                {error && <p className="text-red-500 text-center mt-2">{error}</p>}
                 {/* Display Overall Long Answer Score */}
                 {longAnswerScore !== null && (
                   <p className="text-right font-medium text-gray-700 mt-2">
                      Overall Long Answer Score: {longAnswerScore.toFixed(1)}%
                   </p>
                 )}
            </CardContent>
        </Card>

        {/* Questions Section */}
        {questions && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <Card className="max-w-3xl mx-auto mb-8 shadow-lg border border-gray-200">
                    <CardHeader>
                        <CardTitle>Answer the Questions</CardTitle>
                         <CardDescription>
                           Provide detailed answers. Key points to consider:
                           <div className="flex flex-wrap gap-1 mt-2">
                              {questions.keyPoints.map((kp, idx) => <Badge key={idx} variant="secondary">{kp}</Badge>)}
                           </div>
                         </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-8"> {/* Increased gap */}
                        {questions.questions.map((q, index) => (
                            <div key={index} className="grid gap-3"> {/* Increased gap */}
                                <Label htmlFor={`answer-${index}`} className="font-semibold text-base"> {/* Increased font size */}
                                    Question {index + 1}: {q}
                                </Label>
                                <Textarea
                                    id={`answer-${index}`}
                                    placeholder="Type your answer here..."
                                    value={answers[index]}
                                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                                    disabled={!!feedback} // Disable after submission
                                    rows={6} // Increased rows
                                    className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                                />
                            </div>
                        ))}
                        {!feedback && ( // Only show submit button if feedback hasn't been generated
                            <Button onClick={handleSubmitAnswers} disabled={isChecking || answers.some(a => !a.trim())} className="w-full bg-green-600 hover:bg-green-700 text-white py-3">
                                {isChecking ? "Checking Answers..." : "Submit Answers"}
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        )}

        {/* Feedback Section */}
        {feedback && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                <Card className="max-w-3xl mx-auto shadow-lg border border-gray-200">
                    <CardHeader>
                        <CardTitle>Feedback on Your Answers</CardTitle>
                        <CardDescription>Review the AI feedback for each question.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-6">
                        {feedback.map((fb, index) => (
                            <div key={index} className="p-4 border rounded-md bg-muted/50 shadow-sm">
                                <h3 className="font-semibold mb-3 text-base">Feedback for Question {index + 1}</h3>
                                <div className={`mb-3 p-2 rounded ${fb.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    <strong>Status:</strong> {fb.isCorrect ? "Correct" : "Needs Improvement"}
                                </div>
                                <p className="text-sm mb-2"><strong className="text-gray-600">Your Answer:</strong> {answers[index]}</p>
                                <p className="text-sm mb-2"><strong className="text-gray-600">AI Feedback:</strong> {fb.feedback}</p>
                                <p className="text-sm"><strong className="text-gray-600">Suggested Answer:</strong> {fb.correctAnswer}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </motion.div>
        )}
    </>
  );
};

export default LongAnswerPage;
