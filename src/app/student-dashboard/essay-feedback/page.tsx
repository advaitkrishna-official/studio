
"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { provideEssayFeedback } from "@/ai/flows/provide-essay-feedback";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { saveGrade, getGrades } from "@/lib/firebase";
import { Label } from "@/components/ui/label"; // Added import
import { Input } from "@/components/ui/input"; // Added import

type GradeData = {
  id: string;
  taskName: string;
  score: number;
  feedback: string;
  timestamp: Date;
}

const EssayFeedbackPage = () => {
  const [essay, setEssay] = useState("");
  const [topic, setTopic] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
	const { user } = useAuth();
    const [totalScore, setTotalScore] = useState<number | null>(null); // Renamed from averageScore

    // Fetch total score on mount or when user changes
     useEffect(() => {
         if (user) {
             setTotalScore(null); // Reset score while fetching
             getGrades(user.uid)
                 .then((grades) => {
                     const typedGrades = grades as GradeData[];
                     if (typedGrades.length > 0) {
                         // Calculate total score (sum of scores)
                         const sum = typedGrades.reduce((acc, grade) => acc + (grade.score || 0), 0);
                         setTotalScore(sum);
                     } else {
                        setTotalScore(0); // Set to 0 if no grades
                     }
                 })
                 .catch((e: any) => {
                     console.error("Error fetching grades:", e);
                     setError(e.message || "An error occurred while fetching grades.");
                     setTotalScore(0); // Set to 0 on error
                 });
         } else {
            setTotalScore(null); // Clear score if no user
         }
     }, [user]); // Rerun when user changes


  const handleSubmit = async () => {
    setIsLoading(true);
    setFeedback("");
    setError(null);
    try {
      const result = await provideEssayFeedback({ essay, topic });
      setFeedback(result.feedback);

      // Save feedback to Firebase
      if (user) {
        // Assuming essay feedback doesn't get a numerical score automatically
        // You might want to implement a manual grading step or use AI for scoring separately
        await saveGrade(user.uid, `Essay Feedback: ${topic}`, 0, result.feedback); // Score is 0 for feedback-only
         toast({
           title: "Feedback Generated",
           description: "AI feedback is ready.",
         });

        // Re-fetch scores after saving to update the total
         getGrades(user.uid).then((grades) => {
           const typedGrades = grades as GradeData[];
           const sum = typedGrades.reduce((acc, grade) => acc + (grade.score || 0), 0);
           setTotalScore(sum);
         }).catch(console.error);

      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "You must be logged in to save feedback.",
        });
      }
    } catch (e: any) {
      setError(e.message || "An error occurred while generating feedback.");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to generate essay feedback. Please try again.",
        });
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
    // Container and layout are handled by src/app/student-dashboard/layout.tsx
    <>
        <h1 className="text-3xl font-bold mb-4">Essay Feedback</h1>
        <Card className="max-w-3xl mx-auto shadow-lg border border-gray-200">
            <CardHeader>
                <CardTitle>Get AI Essay Feedback</CardTitle>
                <CardDescription>
                    Enter your essay and topic to receive AI-powered suggestions for improvement.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="grid gap-2">
                    <Label htmlFor="topic" className="font-medium">
                        Essay Topic
                    </Label>
                    <Input // Changed from Textarea for topic
                        id="topic"
                        placeholder="e.g., The Impact of Climate Change"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="essay" className="font-medium">
                        Essay Text
                    </Label>
                    <Textarea
                        id="essay"
                        placeholder="Paste or type your essay text here..."
                        value={essay}
                        onChange={(e) => setEssay(e.target.value)}
                        rows={10} // Increased rows for better visibility
                        className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>
                <Button
                    onClick={handleSubmit}
                    disabled={isLoading || !topic.trim() || !essay.trim()}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3"
                >
                    {isLoading ? "Generating Feedback..." : "Generate Feedback"}
                </Button>

                {error && <p className="text-red-600 text-center mt-2">{error}</p>}

                {feedback && (
                    <div className="grid gap-2 mt-6 border-t pt-6">
                        <Label
                            htmlFor="feedback"
                            className="text-lg font-semibold" // Made label larger
                        >
                            AI Feedback
                        </Label>
                        <div className="relative rounded-md border bg-muted p-4">
                            <Textarea
                                id="feedback"
                                readOnly
                                value={feedback}
                                className="resize-none bg-transparent border-0 focus:ring-0 p-0 h-auto min-h-[150px]" // Adjusted styling
                                rows={8} // Dynamic rows based on content might be better if possible
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                                onClick={handleCopyFeedback}
                                aria-label="Copy feedback"
                            >
                                <Copy className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                )}
                 {totalScore !== null && (
                   <div className="mt-6 text-right border-t pt-4">
                     <p className="text-sm text-muted-foreground">Your current total score across all tasks:</p>
                     <p className="text-xl font-semibold text-gray-700">{totalScore}%</p>
                   </div>
                 )}
            </CardContent>
        </Card>
    </>
  );
};

export default EssayFeedbackPage;
