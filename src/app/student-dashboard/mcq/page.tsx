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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

export default function AnimatedMCQPage() {
  const [topic, setTopic] = useState('');
  const [numQuestions, setNumQuestions] = useState(5);
  const [selectedGrade, setSelectedGrade] = useState('grade-8');
  const [mcq, setMcq] = useState<GenerateMCQOutput | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showAnswers, setShowAnswers] = useState(false);
  const [explanations, setExplanations] = useState<string[]>([]);
  const [quizScore, setQuizScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
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
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateMCQ({ topic, numQuestions, grade: selectedGrade });
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
    setShowAnswers(true);
    if (!mcq) return;
    let correct = 0;
    mcq.questions.forEach((q, i) => { if (answers[i] === q.correctAnswer) correct += 1; });
    setQuizScore(correct);

    // explanations
    const expl = await Promise.all(
      mcq.questions.map(q =>
        generateMcqExplanation({ question: q.question, options: q.options, correctAnswer: q.correctAnswer, grade: selectedGrade })
          .then(r => r.explanation)
          .catch(() => 'No explanation available')
      )
    );
    setExplanations(expl);

    // save
    if (user) {
      const perc = (correct / mcq.questions.length) * 100;
      await saveGrade(user.uid, `Quiz: ${topic}`, perc, `${correct} of ${mcq.questions.length}`);
      toast({ title: 'Quiz submitted', description: `${correct} correct` });
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
          />
          <Label>Grade</Label>
          <Select value={selectedGrade} onValueChange={setSelectedGrade}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="grade-8">Grade 8</SelectItem>
              <SelectItem value="grade-6">Grade 6</SelectItem>
              <SelectItem value="grade-4">Grade 4</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleGenerate} disabled={isLoading}>
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
                <p>Your total score: {totalScore}%</p>
              )}
            </div>

            {mcq.questions.map((q, i) => (
              <Card key={i} className="p-4">
                <CardHeader><CardTitle>Question {i + 1}</CardTitle></CardHeader>
                <CardContent>
                  <p className="font-semibold mb-2">{q.question}</p>
                  <RadioGroup onValueChange={val => handleAnswerChange(i, val)}>
                    {q.options.map((opt, j) => (
                      <div key={j} className="flex items-center space-x-2">
                        <RadioGroupItem value={opt} id={`opt-${i}-${j}`} />
                        <Label htmlFor={`opt-${i}-${j}`}>{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {showAnswers && (
                    <div className="mt-4 space-y-1">
                      <p className={`font-medium ${answers[i]===q.correctAnswer?'text-green-600':'text-red-600'}`}>
                        {answers[i]===q.correctAnswer ? <><CheckCircle className="inline"/> Correct</> : <><Circle className="inline"/> Incorrect</>}
                      </p>
                      <p>Answer: {q.correctAnswer}</p>
                      <p className="text-sm text-gray-700">Explanation: {explanations[i]}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {!showAnswers && (
              <Button onClick={handleSubmitQuiz}>Submit Quiz</Button>
            )}
          </div>
        )}
      </motion.div>

    </div>
  );
}
