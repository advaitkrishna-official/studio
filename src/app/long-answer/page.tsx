"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { generateLongAnswerQuestions, GenerateLongAnswerQuestionsOutput } from "@/ai/flows/generate-long-answer-questions";

const LongAnswerPage = () => {
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(3);
  const [questions, setQuestions] = useState<GenerateLongAnswerQuestionsOutput | null>(null);
    const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
        setIsLoading(true);
        setError(null);
    try {
      const result = await generateLongAnswerQuestions({ topic, numQuestions });
      setQuestions(result);
    } catch (e: any) {
      setError(e.message || "An error occurred while generating questions.");
    } finally {
            setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Long Answer Question Generator</CardTitle>
          <CardDescription>
            Enter a topic and the number of questions to generate.
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
            <Label htmlFor="numQuestions">Number of Questions</Label>
            <Input
              id="numQuestions"
              type="number"
              placeholder="Number of questions to generate"
              value={numQuestions.toString()}
              onChange={(e) => setNumQuestions(parseInt(e.target.value))}
            />
          </div>
            <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? "Generating Questions..." : "Generate Questions"}
            </Button>
                        {error && <p className="text-red-500">{error}</p>}
        </CardContent>
      </Card>

      {questions && (
        <div className="mt-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight">Generated Questions</h2>
          <p className="text-sm text-muted-foreground">
            Here are your AI generated long answer questions on the topic of {topic}
          </p>
          <div className="grid gap-4 mt-4">
            {questions.questions.map((question, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>Question {index + 1}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-bold">{question}</p>
                  <p className="mt-2">
                    Key Points: {questions.keyPoints[index] || "No key points suggested."}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LongAnswerPage;
