'use client';

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { generateLongAnswerQuestions, GenerateLongAnswerQuestionsOutput } from "@/ai/flows/generate-long-answer-questions";
import { Textarea } from "@/components/ui/textarea";
import { checkLongAnswer } from "@/ai/flows/check-long-answer";
import { useAuth } from "@/components/auth-provider";
import { saveGrade, getGrades } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from 'react';

const LongAnswerPage = () => {
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(3);
  const [questions, setQuestions] = useState<GenerateLongAnswerQuestionsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [totalScore, setTotalScore] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      getGrades(user.uid).then(grades => {
        const sum = grades.reduce((acc, grade) => acc + grade.score, 0);
        setTotalScore(sum);
      }).catch(e => {
        console.error("Error fetching grades:", e);
        setError(e.message || "An error occurred while fetching grades.");
      });
    }
  }, [user]);

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
              .then(result => {
                setQuestions(result);
                toast({
                  title: "Long Answer Questions Generated",
                  description: "The long answer questions have been generated.",
                });
              })
              .catch(e => {
                setError(e.message || "An error occurred while generating questions.");
                toast({
                  variant: "destructive",
                  title: "Error",
                  description: "Failed to generate long answer questions. Please try again.",
                });
              })
              .finally(() => setIsLoading(false));
          }} disabled={isLoading}>
            {isLoading ? "Generating Questions..." : "Generate Questions"}
          </Button>
          {error && <p className="text-red-500">{error}</p>}
        </CardContent>
      </Card>

      {questions && questions.questions && (
        <div className="mt-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight">Generated Questions</h2>
          <p className="text-sm text-muted-foreground">
            Here are your AI generated long answer questions on the topic of {topic}
          </p>
          {totalScore !== null && (
            <div className="mt-4">
              <h3 className="text-xl font-bold tracking-tight">Total Score</h3>
              <p className="mt-2 text-sm text-muted-foreground">Your total score: {totalScore}%</p>
            </div>
          )}
          <div className="grid gap-4 mt-4">
            {questions.questions.map((question, index) => (
              <LongAnswerCard key={index} question={question} keyPoints={questions.keyPoints ? questions.keyPoints[index] || "" : ""} topic={topic} user={user} toast={toast} />
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
  topic: string;
  user: any;
  toast: any;
}

const LongAnswerCard: React.FC<LongAnswerCardProps> = ({ question, keyPoints, topic, user, toast }) => {
  const [studentAnswer, setStudentAnswer] = useState("");
  const [solution, setSolution] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isCorrect, setIsCorrect] = useState(false);
  const [checkingAnswer, setCheckingAnswer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null); // Add score state

  const handleCheckAnswer = async (studentAnswer: string) => {
    setCheckingAnswer(true);
    setError(null);
    try {
      const result = await checkLongAnswer({ question, studentAnswer, keyPoints: [keyPoints || ""] });
      setSolution(result.correctAnswer);
      setFeedback(result.feedback);
      setIsCorrect(result.isCorrect);

      // Determine the score based on the result
      const newScore = result.isCorrect ? 100 : 0;
      setScore(newScore);

      // Save grade and feedback
      if (user) {
        await saveGrade(user.uid, `Long Answer on ${topic}: ${question}`, newScore, result.feedback);
      }
      toast({
        title: "Long Answer Checked",
        description: "Your long answer has been checked.",
      });
    } catch (e: any) {
      setError(e.message || "An error occurred while checking the answer.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to check long answer. Please try again.",
      });
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

        {/*{score !== null && (
          <div className="mt-4">
            <h3 className="text-xl font-bold tracking-tight">Score</h3>
            <p className="mt-2 text-sm text-muted-foreground">Your score: {score}%</p>
          </div>
        )}*/}
        {error && <p className="text-red-500">{error}</p>}
      </CardContent>
    </Card>
  );
};

export default LongAnswerPage;
