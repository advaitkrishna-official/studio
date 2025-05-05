'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { generateMCQ, GenerateMCQOutput } from '@/ai/flows/generate-mcq';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle, Circle } from 'lucide-react';
import { generateMcqExplanation } from '@/ai/flows/generate-mcq-explanation';
import { useAuth } from '@/components/auth-provider';
import { saveGrade, getGrades } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function AnimatedMCQPage() {
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const { user, userClass } = useAuth(); // Get userClass (student's grade)
  const [mcq, setMcq] = useState<GenerateMCQOutput | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showAnswers, setShowAnswers] = useState(false);
  const [explanations, setExplanations] = useState<string[]>([]);
  const [quizScore, setQuizScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalScore, setTotalScore] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch total score on mount
  useEffect(() => {
    if (user) {
      getGrades(user.uid)
        .then((grades) => {
          const sum = (grades as { score: number }[]).reduce((a, g) => a + g.score, 0);
          setTotalScore(sum);
        })
        .catch((e) => {
          console.error(e);
          setError('Failed to load previous scores');
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
    try {
      // Pass the student's grade from userClass
      const result = await generateMCQ({ topic, numQuestions, grade: userClass });
      setMcq(result);
      setAnswers(Array(result.questions.length).fill(''));
      setShowAnswers(false);
      setExplanations(Array(result.questions.length).fill(''));
      setQuizScore(0);
      toast({ title: 'MCQs generated' });
    } catch (e: any) {
      setError(e.message);
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (idx: number, value: string) => {
    const arr = [...answers]; arr[idx] = value; setAnswers(arr);
  };

  const handleSubmitQuiz = async () => {
    if (!mcq || !userClass) return; // Need userClass for explanation generation
    setShowAnswers(true);

    let correct = 0;
    mcq.questions.forEach((q, i) => { if (answers[i] === q.correctAnswer) correct += 1; });
    const scorePercentage = (correct / mcq.questions.length) * 100;
    setQuizScore(correct); // Keep track of the raw score if needed

    // Explanations - Now use userClass
    const expl = await Promise.all(
      mcq.questions.map(q =>
        generateMcqExplanation({ question: q.question, options: q.options, correctAnswer: q.correctAnswer, grade: userClass })
          .then(r => r.explanation)
          .catch(() => 'No explanation available')
      )
    );
    setExplanations(expl);

    // Save the grade
    if (user) {
      try {
        await saveGrade(user.uid, `MCQ Quiz: ${topic}`, scorePercentage, `${correct} of ${mcq.questions.length} correct`);
        toast({ title: 'Quiz submitted', description: `${correct} out of ${mcq.questions.length} correct (${scorePercentage.toFixed(1)}%)` });
        // Update total score display locally
        getGrades(user.uid).then((grades) => {
            const sum = (grades as { score: number }[]).reduce((a, g) => a + g.score, 0);
            setTotalScore(sum);
          }).catch(console.error);
      } catch(saveError: any) {
         console.error("Failed to save grade:", saveError);
         toast({ variant: 'destructive', title: 'Error Saving Grade', description: saveError.message });
      }

    }
  };

  return (
    <div className="relative flex justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 overflow-hidden p-4">
      {/* Animated Background Blobs */}
      <motion.div
        className="absolute w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-30"
        animate={{ x: [-100, 100, -100], y: [-80, 80, -80] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/4 right-0 w-56 h-56 bg-pink-300 rounded-full mix-blend-multiply filter blur-2xl opacity-25"
        animate={{ y: [0, 200, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-3xl bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 space-y-6"
      >
        {/* Generation Form */}
        <div className="grid gap-4">
          <Label>Topic</Label>
          <Input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            placeholder="Enter topic..."
          />
          <Label>Number of Questions</Label>
          <Input
            type="number"
            value={numQuestions}
            onChange={e => setNumQuestions(+e.target.value)}
            min="1"
          />
          {/* Removed Grade Selector */}
          <Button onClick={handleGenerate} disabled={isLoading || !userClass}>
            {isLoading ? 'Generating...' : 'Generate MCQs'}
          </Button>
          {error && <p className="text-red-500">{error}</p>}
        </div>

        {/* Generated Questions */}
        {mcq && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">MCQs on "{topic}"</h2>
              {totalScore != null && (
                <p>Your total score: {totalScore.toFixed(1)}%</p>
              )}
            </div>

            {mcq.questions.map((q, i) => (
              <Card key={i} className="p-4">
                <CardHeader><CardTitle>Question {i + 1}</CardTitle></CardHeader>
                <CardContent>
                  <p className="font-semibold mb-2">{q.question}</p>
                  <RadioGroup onValueChange={val => handleAnswerChange(i, val)} value={answers[i]} disabled={showAnswers}>
                    {q.options.map((opt, j) => (
                      <div key={j} className="flex items-center space-x-2">
                        <RadioGroupItem value={opt} id={`opt-${i}-${j}`} />
                        <Label htmlFor={`opt-${i}-${j}`}>{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {showAnswers && (
                    <div className="mt-4 space-y-1 border-t pt-3">
                      <p className={`font-medium ${answers[i] === q.correctAnswer ? 'text-green-600' : 'text-red-600'}`}>
                        {answers[i] === q.correctAnswer ? <><CheckCircle className="inline h-4 w-4 mr-1"/> Correct</> : <><Circle className="inline h-4 w-4 mr-1"/> Incorrect</>}
                        {answers[i] !== q.correctAnswer && ` (Your answer: ${answers[i] || 'Not answered'})`}
                      </p>
                      <p>Correct Answer: {q.correctAnswer}</p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-blue-600 hover:underline">Explanation</summary>
                        <p className="text-sm text-gray-700 mt-1 p-2 bg-gray-50 rounded">{explanations[i]}</p>
                      </details>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {!showAnswers && (
              <Button onClick={handleSubmitQuiz} disabled={answers.some(a => a === '')}>Submit Quiz</Button>
            )}
            {showAnswers && (
                 <p className="text-center font-semibold text-lg">Quiz Score: {quizScore} / {mcq.questions.length}</p>
            )}
          </div>
        )}
      </motion.div>

    </div>
  );
}