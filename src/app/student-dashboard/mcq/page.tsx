
'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'; // Added CardDescription
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { generateMCQ, GenerateMCQOutput } from '@/ai/flows/generate-mcq';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle, XCircle, Info } from 'lucide-react'; // Changed Circle to XCircle for incorrect
import { generateMcqExplanation } from '@/ai/flows/generate-mcq-explanation';
import { useAuth } from '@/components/auth-provider';
import { saveGrade, getGrades, GradeData } from '@/lib/firebase'; // Import GradeData
import { useToast } from '@/hooks/use-toast';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"; // For explanations


export default function AnimatedMCQPage() {
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const { user, userClass, loading: authLoading } = useAuth(); // Get userClass (student's grade) and auth loading
  const [mcq, setMcq] = useState<GenerateMCQOutput | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showAnswers, setShowAnswers] = useState(false);
  const [explanations, setExplanations] = useState<string[]>([]);
  const [quizScore, setQuizScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false); // For generating MCQs
  const [isSubmitting, setIsSubmitting] = useState(false); // For submitting quiz
  const [error, setError] = useState<string | null>(null);
  const [totalScore, setTotalScore] = useState<number | null>(null); // Overall score from DB
  const { toast } = useToast();

  // Fetch total score on mount or user change
  useEffect(() => {
    if (user) {
      setTotalScore(null); // Reset while fetching
      getGrades(user.uid)
        .then((grades) => {
          const typedGrades = grades as GradeData[]; // Type assertion
          const sum = typedGrades.reduce((a, g) => a + (g.score || 0), 0); // Ensure score is a number
          setTotalScore(sum);
        })
        .catch((e) => {
          console.error("Error fetching total score:", e);
          setError('Failed to load previous scores');
          setTotalScore(0); // Set to 0 on error
        });
    } else {
      setTotalScore(null); // Clear if no user
    }
  }, [user]);

  const handleGenerate = async () => {
     if (authLoading) {
         toast({ variant: 'destructive', title: 'Loading', description: 'Please wait...' });
         return;
     }
     if (!userClass) {
        setError("Student grade not found.");
        toast({ variant: 'destructive', title: 'Error', description: 'Student grade not found.' });
        return;
    }
     if (!topic.trim()) {
        setError("Please enter a topic.");
        toast({ variant: 'destructive', title: 'Error', description: 'Topic is required.' });
        return;
     }
    setIsLoading(true);
    setError(null);
    try {
      // Pass the student's grade from userClass
      const result = await generateMCQ({ topic, numQuestions, grade: userClass });
      if (!result || !result.questions || result.questions.length === 0) {
         setError("AI could not generate MCQs for this topic.");
         toast({ variant: 'destructive', title: 'Generation Failed', description: 'Try a different topic.' });
         setMcq(null);
      } else {
        setMcq(result);
        setAnswers(Array(result.questions.length).fill(''));
        setShowAnswers(false);
        setExplanations(Array(result.questions.length).fill(''));
        setQuizScore(0);
        toast({ title: 'MCQs generated' });
      }
    } catch (e: any) {
      console.error("Error generating MCQs:", e);
      setError(e.message || "An error occurred during generation.");
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (idx: number, value: string) => {
    const arr = [...answers]; arr[idx] = value; setAnswers(arr);
  };

  const handleSubmitQuiz = async () => {
    if (authLoading || !mcq || !userClass || !user) {
         toast({ variant: 'destructive', title: 'Error', description: 'Cannot submit quiz. User or quiz data missing.' });
         return;
    }
     if (answers.some(a => a === '')) {
        toast({ variant: 'destructive', title: 'Incomplete', description: 'Please answer all questions.' });
        return;
     }

    setIsSubmitting(true); // Start submitting state
    setShowAnswers(true);

    let correct = 0;
    mcq.questions.forEach((q, i) => { if (answers[i] === q.correctAnswer) correct += 1; });
    const scorePercentage = (correct / mcq.questions.length) * 100;
    setQuizScore(correct); // Keep track of the raw score if needed

    // Fetch Explanations
    try {
        const explPromises = mcq.questions.map(q =>
            generateMcqExplanation({ question: q.question, options: q.options, correctAnswer: q.correctAnswer, grade: userClass })
                .then(r => r.explanation)
                .catch(() => 'Explanation currently unavailable.') // Provide fallback
        );
        const resolvedExplanations = await Promise.all(explPromises);
        setExplanations(resolvedExplanations);
    } catch (explError: any) {
        console.error("Error fetching explanations:", explError);
        setExplanations(Array(mcq.questions.length).fill('Could not load explanation.'));
        toast({ variant: 'destructive', title: 'Explanation Error', description: 'Could not fetch explanations.' });
    }


    // Save the grade
    try {
        await saveGrade(user.uid, `MCQ Quiz: ${topic}`, scorePercentage, `${correct} of ${mcq.questions.length} correct`);
        toast({ title: 'Quiz submitted', description: `Score: ${correct} / ${mcq.questions.length} (${scorePercentage.toFixed(1)}%)` });

        // Update total score display locally after saving
        getGrades(user.uid).then((grades) => {
            const typedGrades = grades as GradeData[];
            const sum = typedGrades.reduce((a, g) => a + (g.score || 0), 0);
            setTotalScore(sum);
        }).catch(console.error);
    } catch(saveError: any) {
         console.error("Failed to save grade:", saveError);
         toast({ variant: 'destructive', title: 'Error Saving Grade', description: saveError.message });
    } finally {
        setIsSubmitting(false); // End submitting state
    }
  };

   // Disable generate button state
   const isGenerateDisabled = isLoading || authLoading || !userClass || !topic.trim();

  return (
    // Container and layout handled by src/app/student-dashboard/layout.tsx
     <>
        <h1 className="text-3xl font-bold mb-4">Multiple Choice Questions (MCQ)</h1>
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative z-10 w-full max-w-3xl mx-auto bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 space-y-8 border border-gray-200"
        >
            {/* Generation Form Card */}
            <Card className="border-0 shadow-none">
              <CardHeader>
                 <CardTitle>Generate MCQ Practice</CardTitle>
                 <CardDescription>Enter a topic and number of questions to start practicing.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                 <div className="grid gap-4 md:grid-cols-2 items-end">
                    <div className="grid gap-2">
                      <Label htmlFor="topic" className="font-medium">Topic</Label>
                      <Input
                        id="topic"
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        placeholder="e.g., Cell Biology, WW1 Causes"
                        className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="numQuestions" className="font-medium">Number of Questions</Label>
                      <Input
                        id="numQuestions"
                        type="number"
                        value={numQuestions}
                        onChange={e => setNumQuestions(Math.max(1, +e.target.value))} // Ensure at least 1
                        min="1"
                        max="20" // Limit max questions if needed
                        className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                 </div>
                 <Button onClick={handleGenerate} disabled={isGenerateDisabled} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3">
                    {isLoading ? 'Generating...' : 'Generate MCQs'}
                 </Button>
                 {error && <p className="text-red-500 text-center">{error}</p>}
                 {/* Display Total Score */}
                  {totalScore !== null && (
                    <p className="text-right font-medium text-gray-700 mt-2">
                        Overall MCQ Score: {totalScore.toFixed(1)}%
                    </p>
                  )}
              </CardContent>
            </Card>


            {/* Generated Questions */}
            {mcq && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-6 border-t pt-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-semibold">MCQs on "{topic}"</h2>
                   {showAnswers && (
                     <p className="text-center font-semibold text-lg text-indigo-700">Quiz Score: {quizScore} / {mcq.questions.length}</p>
                   )}
                </div>

                {mcq.questions.map((q, i) => (
                  <Card key={i} className={`p-4 border rounded-lg shadow-sm ${showAnswers ? (answers[i] === q.correctAnswer ? 'border-green-300 bg-green-50/50' : 'border-red-300 bg-red-50/50') : 'border-gray-200'}`}>
                    <CardHeader className="p-0 mb-3">
                      <CardTitle className="text-base font-medium">Question {i + 1}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <p className="font-semibold mb-3 text-gray-800">{q.question}</p>
                      <RadioGroup onValueChange={val => handleAnswerChange(i, val)} value={answers[i]} disabled={showAnswers} className="space-y-2">
                        {q.options.map((opt, j) => (
                          <div key={j} className={`flex items-center space-x-3 p-2 rounded border ${showAnswers && opt === q.correctAnswer ? 'border-green-500 bg-green-100' : 'border-gray-200'} ${showAnswers && answers[i] === opt && opt !== q.correctAnswer ? 'border-red-500 bg-red-100' : ''}`}>
                             <RadioGroupItem value={opt} id={`opt-${i}-${j}`} className="border-gray-400 data-[state=checked]:border-indigo-600"/>
                             <Label htmlFor={`opt-${i}-${j}`} className="text-sm text-gray-700 flex-1 cursor-pointer">{opt}</Label>
                             {showAnswers && opt === q.correctAnswer && <CheckCircle className="h-5 w-5 text-green-600" />}
                             {showAnswers && answers[i] === opt && opt !== q.correctAnswer && <XCircle className="h-5 w-5 text-red-600" />}
                          </div>
                        ))}
                      </RadioGroup>

                      {showAnswers && (
                        <Accordion type="single" collapsible className="mt-4">
                           <AccordionItem value={`item-${i}`} className="border-t pt-3">
                             <AccordionTrigger className="text-sm text-indigo-600 hover:no-underline font-medium py-1">
                               <Info className="inline h-4 w-4 mr-1"/> Explanation
                             </AccordionTrigger>
                             <AccordionContent className="text-sm text-gray-600 mt-1 p-3 bg-gray-50 rounded border">
                               {isSubmitting && explanations[i] === '' ? 'Loading explanation...' : explanations[i]}
                             </AccordionContent>
                           </AccordionItem>
                         </Accordion>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {!showAnswers && (
                  <Button onClick={handleSubmitQuiz} disabled={isSubmitting || answers.some(a => a === '')} className="w-full bg-green-600 hover:bg-green-700 text-white py-3">
                     {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
                  </Button>
                )}

              </motion.div>
            )}
        </motion.div>
     </>
  );
}
