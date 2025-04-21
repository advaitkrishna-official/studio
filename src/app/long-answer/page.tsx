"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { generateLongAnswerQuestions, GenerateLongAnswerQuestionsOutput } from "@/ai/flows/generate-long-answer-questions";
import { Textarea } from "@/components/ui/textarea";
import { checkLongAnswer } from "@/ai/flows/check-long-answer";

const LongAnswerPage = () => {
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(3);
  const [questions, setQuestions] = useState<GenerateLongAnswerQuestionsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          <Button onClick={() => {
               setIsLoading(true);
               setError(null);
               generateLongAnswerQuestions({ topic, numQuestions })
                 .then(result => setQuestions(result))
                 .catch(e => setError(e.message || "An error occurred while generating questions."))
                 .finally(() => setIsLoading(false));
          }} disabled={isLoading}>
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
              <LongAnswerCard key={index} question={question} keyPoints={questions.keyPoints[index] || ""} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface LongAnswerCardProps {
  question: string;
  keyPoints: string;
}

const LongAnswerCard: React.FC<LongAnswerCardProps> = ({ question, keyPoints }) => {
  const [studentAnswer, setStudentAnswer] = useState("");
  const [solution, setSolution] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckAnswer = async (studentAnswer: string) => {
    setCheckingAnswer(true);
    setError(null);
    try {
      const result = await checkLongAnswer({ question, studentAnswer, keyPoints: [keyPoints || ""] });
      setSolution(result.correctAnswer);
      setFeedback(result.feedback);
      setIsCorrect(result.isCorrect);
    } catch (e: any) {
      setError(e.message || "An error occurred while checking the answer.");
    } finally {
      setCheckingAnswer(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Question</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-bold">{question}</p>
        <p className="mt-2">
          Key Points: {keyPoints || "No key points suggested."}
        </p>
        <div className="grid gap-2 mt-4">
          <Label htmlFor="studentAnswer">Your Answer</Label>
          <Textarea
            id="studentAnswer"
            placeholder="Enter your answer here..."
            value={studentAnswer}
            onChange={(e) => setStudentAnswer(e.target.value)}
          />
        </div>
        <Button
          onClick={() => handleCheckAnswer(studentAnswer)}
          disabled={checkingAnswer}
        >
          {checkingAnswer ? "Checking Answer..." : "Check Answer"}
        </Button>

        {solution && (
          <div className="mt-4">
            <h3 className="text-xl font-bold tracking-tight">Solution</h3>
            <p className={isCorrect ? "text-green-500" : "text-red-500"}>{isCorrect ? "Correct Answer!" : "Incorrect Answer. Please review the solution and feedback."}</p>
            <p className="mt-2">{solution}</p>
          </div>
        )}

        {feedback && (
          <div className="mt-4">
            <h3 className="text-xl font-bold tracking-tight">Feedback</h3>
            <p className="mt-2">{feedback}</p>
          </div>
        )}
           {error && <p className="text-red-500">{error}</p>}
      </CardContent>
    </Card>
  );
};

export default LongAnswerPage;
