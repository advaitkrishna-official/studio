
"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { provideEssayFeedback } from "@/ai/flows/provide-essay-feedback";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { saveGrade } from "@/lib/firebase";

const EssayFeedbackPage = () => {
  const [essay, setEssay] = useState("");
  const [topic, setTopic] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
	const { user } = useAuth();

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await provideEssayFeedback({ essay, topic });
      setFeedback(result.feedback);

      // Save feedback to Firebase
      if (user) {
        await saveGrade(user.uid, `Essay on ${topic}`, 0, result.feedback); // Score is set to 0 as AI only provides feedback
      }
    } catch (e: any) {
      setError(e.message || "An error occurred while generating feedback.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyFeedback = () => {
    navigator.clipboard.writeText(feedback);
    toast({
      title: "Feedback Copied",
      description: "The essay feedback has been copied to your clipboard.",
    });
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Essay Feedback</CardTitle>
          <CardDescription>
            Enter your essay and topic to get AI-powered feedback.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="topic" className="text-sm font-medium leading-none">
              Essay Topic
            </label>
            <Textarea
              id="topic"
              placeholder="Enter the essay topic..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="essay" className="text-sm font-medium leading-none">
              Essay Text
            </label>
            <Textarea
              id="essay"
              placeholder="Enter your essay text here..."
              value={essay}
              onChange={(e) => setEssay(e.target.value)}
            />
          </div>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Generating Feedback..." : "Generate Feedback"}
          </Button>
          {error && <p className="text-red-500">{error}</p>}
          {feedback && (
            <div className="grid gap-2">
              <label
                htmlFor="feedback"
                className="text-sm font-medium leading-none"
              >
                Feedback
              </label>
              <div className="relative">
                <Textarea
                  id="feedback"
                  readOnly
                  value={feedback}
                  className="resize-none"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleCopyFeedback}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EssayFeedbackPage;
