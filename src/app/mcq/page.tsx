"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { generateMCQ, GenerateMCQOutput } from "@/ai/flows/generate-mcq";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CheckCircle, Circle } from "lucide-react";

const MCQPage = () => {
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [mcq, setMcq] = useState<GenerateMCQOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showAnswers, setShowAnswers] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateMCQ({ topic, numQuestions });
      setMcq(result);
      setAnswers(Array(result.questions.length).fill(""));
      setShowAnswers(false);
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

  const handleSubmitQuiz = () => {
    setShowAnswers(true);
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

      {mcq && (
        <div className="mt-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight">Generated MCQs</h2>
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
                        Explanation: {/* Add explanation logic here if available */}
                        {answers[index] === q.correctAnswer ? 'You got it right' : 'Better Luck Next Time'}
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
