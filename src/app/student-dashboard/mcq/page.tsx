"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { generateMCQ, GenerateMCQOutput } from "@/ai/flows/generate-mcq";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle, Circle } from "lucide-react";
import { generateMcqExplanation } from "@/ai/flows/generate-mcq-explanation";
import { useAuth } from "@/components/auth-provider";
import { saveGrade } from "@/lib/firebase";

const MCQPage = () => {
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [mcq, setMcq] = useState<GenerateMCQOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showAnswers, setShowAnswers] = useState(false);
  const [explanations, setExplanations] = useState<string[]>([]); // New state for explanations
  const { user } = useAuth();
  const [quizScore, setQuizScore] = useState(0);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateMCQ({ topic, numQuestions });
      setMcq(result);
      setAnswers(Array(result?.questions?.length || 0).fill(""));
      setShowAnswers(false);
      setExplanations(Array(result?.questions?.length || 0).fill("")); // Initialize explanations
      setQuizScore(0); // Reset quiz score
    } catch (e: any) {
      setError(e.message || "An error occurred while generating MCQs.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmitQuiz = async () => {
    setShowAnswers(true);
    let correctCount = 0;

    // Calculate the quiz score
    if (mcq && mcq.questions) {
      for (let i = 0; i < mcq.questions.length; i++) {
        if (answers[i] === mcq.questions[i].correctAnswer) {
          correctCount++;
        }
      }
      setQuizScore(correctCount);

      // Generate explanations for each question
      const newExplanations = await Promise.all(
        mcq.questions.map(async (q) => {
          try {
            const explanationResult = await generateMcqExplanation({
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
            });
            return explanationResult.explanation;
          } catch (error: any) {
            console.error("Error generating explanation:", error);
            return "Explanation not available.";
          }
        })
      );
      setExplanations(newExplanations);

      // Save the grade to Firebase
      if (user) {
        const scorePercentage = (correctCount / mcq.questions.length) * 100;
        await saveGrade(user.uid, `MCQ Quiz on ${topic}`, scorePercentage, `You got ${correctCount} out of ${mcq.questions.length} correct.`);
      }
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>MCQ Generator</CardTitle>
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
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="numQuestions">Number of MCQs</Label>
            <Input
              id="numQuestions"
              type="number"
              placeholder="Number of MCQs to generate"
              value={numQuestions.toString()}
              onChange={(e) => setNumQuestions(parseInt(e.target.value))}
            />
          </div>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Generating MCQs..." : "Generate MCQs"}
          </Button>
          {error && <p className="text-red-500">{error}</p>}
        </CardContent>
      </Card>

      {mcq && mcq.questions && (
        <div className="mt-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight">Generated MCQs</h2>
          <p className="text-sm text-muted-foreground">
            Here are your AI generated MCQs on the topic of {topic}
          </p>
          {showAnswers && (
            <p className="text-sm text-muted-foreground">
              Your Score: {quizScore} out of {mcq.questions.length}
            </p>
          )}
          <div className="grid gap-4 mt-4">
            {mcq.questions.map((q, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>Question {index + 1}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-bold">{q.question}</p>
                  <RadioGroup onValueChange={(value) => handleAnswerChange(index, value)}>
                    {q.options.map((option, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`q-${index}-option-${i}`} />
                        <Label htmlFor={`q-${index}-option-${i}`}>
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {showAnswers && (
                    <div className="mt-4">
                      <p>
                        {answers[index] === q.correctAnswer ? (
                          <span className="text-green-500 flex gap-2 items-center"><CheckCircle className="h-4 w-4"/> Correct!</span>
                        ) : (
                          <span className="text-red-500 flex gap-2 items-center"><Circle className="h-4 w-4"/> Incorrect.</span>
                        )}
                      </p>
                      <p className="mt-2">
                        Correct Answer: {q.correctAnswer}
                      </p>
                      <p className="mt-2">
                        Explanation: {explanations[index] || 'Generating Explanation...'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {!showAnswers && (
            <Button onClick={handleSubmitQuiz}>Submit Quiz</Button>
          )}
        </div>
      )}
    </div>
  );
};

export default MCQPage;
