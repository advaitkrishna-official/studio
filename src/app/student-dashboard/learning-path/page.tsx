"use client";

import { useState, useEffect } from "react"; // Added useEffect
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { personalizeLearningPath } from "@/ai/flows/personalize-learning-path";
import { useAuth } from '@/components/auth-provider'; // Import useAuth
import { useToast } from "@/hooks/use-toast"; // Import useToast

interface Recommendations {
  recommendedTopics: { topic: string; reason: string; }[];
  recommendedQuestionTypes: { reason: string; questionType: string; }[];
  summary: string;
}


const LearningPathPage = () => {
  const [performanceData, setPerformanceData] = useState("");
  const [learningStyle, setLearningStyle] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, userClass } = useAuth(); // Get user and userClass
  const { toast } = useToast(); // Use the toast hook

  // Removed studentId state as we get it from useAuth
  // Removed selectedGrade state as we get it from useAuth (userClass)

  const handleSubmit = async () => {
    // Ensure user and userClass are available
    if (!user || !userClass) {
        setError("User information is not available. Please log in again.");
        toast({ variant: 'destructive', title: 'Error', description: 'User information missing.' });
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await personalizeLearningPath({
        grade: userClass, // Use the student's grade from auth context
        studentId: user.uid, // Use the student's ID from auth context
        performanceData,
        learningStyle,
      });
      setRecommendations(result);
      toast({ title: 'Learning Path Generated', description: 'Recommendations are ready.' });
    } catch (e: any) {
      setError(e.message || "An error occurred while generating the learning path.");
      toast({ variant: 'destructive', title: 'Error Generating Path', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
        <Card className="max-w-3xl mx-auto">
            <CardHeader>
                <CardTitle>Personalized Learning Path</CardTitle>
                <CardDescription>
                    Enter your performance data and optional learning style to get AI-driven recommendations.
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                {/* Removed Student ID input */}
                <div className="grid gap-2">
                    <Label htmlFor="performanceData">Performance Data (JSON)</Label>
                    <Textarea
                        id="performanceData"
                        placeholder='Example: {"topics": {"Algebra": 75, "Geometry": 50}, "questionTypes": {"MCQ": 80, "LongAnswer": 60}}'
                        value={performanceData}
                        onChange={(e) => setPerformanceData(e.target.value)}
                        rows={5}
                    />
                    <p className="text-xs text-muted-foreground">
                        Provide data on topics/questions attempted and accuracy (%).
                    </p>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="learningStyle">Learning Style (Optional)</Label>
                    <Input
                        id="learningStyle"
                        placeholder="e.g., visual, auditory, kinesthetic"
                        value={learningStyle}
                        onChange={(e) => setLearningStyle(e.target.value)}
                    />
                </div>
                {/* Removed Grade Selector */}

                <Button onClick={handleSubmit} disabled={isLoading || !user || !userClass}>
                    {isLoading ? "Generating Learning Path..." : "Generate Learning Path"}
                </Button>
                {error && <p className="text-red-500 mt-2">{error}</p>}
            </CardContent>
        </Card>

      {recommendations && (
        <Card className="max-w-3xl mx-auto mt-8">
           <CardHeader>
              <CardTitle>Your Personalized Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
                 <div>
                   <h3 className="text-lg font-semibold mb-2">Summary</h3>
                   <p className="text-muted-foreground">{recommendations.summary}</p>
                 </div>
                 <div className="grid md:grid-cols-2 gap-6">
                     <div>
                       <h3 className="text-lg font-semibold mb-2">Recommended Topics</h3>
                       <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                         {recommendations.recommendedTopics.map((topic, index) => (
                           <li key={index}>
                             <strong>{topic.topic}:</strong> {topic.reason}
                           </li>
                         ))}
                       </ul>
                     </div>
                     <div>
                       <h3 className="text-lg font-semibold mb-2">Recommended Question Types</h3>
                       <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                         {recommendations.recommendedQuestionTypes.map((qt, index) => (
                           <li key={index}>
                             <strong>{qt.questionType}:</strong> {qt.reason}
                           </li>
                         ))}
                       </ul>
                     </div>
                 </div>
            </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LearningPathPage;