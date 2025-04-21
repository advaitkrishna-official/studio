"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { generateMCQ, GenerateMCQOutput } from "@/ai/flows/generate-mcq";

const MCQPage = () => {
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [mcq, setMcq] = useState<GenerateMCQOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);
    try {
      const result = await generateMCQ({ topic, numQuestions });
      setMcq(result);
    } catch (e: any) {
      setError(e.message || "An error occurred while generating MCQs.");
    } finally {
            setIsLoading(false);
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
                  <ul className="list-disc pl-5 mt-2">
                    {q.options.map((option, i) => (
                      <li key={i}>{option}</li>
                    ))}
                  </ul>
                  <p className="mt-2">Correct Answer: {q.correctAnswer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MCQPage;
