"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { personalizeLearningPath } from "@/ai/flows/personalize-learning-path";

const LearningPathPage = () => {
  const [studentId, setStudentId] = useState("");
  const [performanceData, setPerformanceData] = useState("");
  const [learningStyle, setLearningStyle] = useState("");
  const [recommendations, setRecommendations] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await personalizeLearningPath({
        studentId,
        performanceData,
        learningStyle,
      });
      setRecommendations(result);
    } catch (e: any) {
      setError(e.message || "An error occurred while generating the learning path.");
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
            Enter your student ID, performance data, and learning style to get a personalized learning path.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="studentId">Student ID</Label>
            <Input
              id="studentId"
              placeholder="Enter student ID..."
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="performanceData">Performance Data (JSON)</Label>
            <Textarea
              id="performanceData"
              placeholder="Enter performance data in JSON format..."
              value={performanceData}
              onChange={(e) => setPerformanceData(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="learningStyle">Learning Style (Optional)</Label>
            <Input
              id="learningStyle"
              placeholder="Enter learning style (e.g., visual, auditory, kinesthetic)..."
              value={learningStyle}
              onChange={(e) => setLearningStyle(e.target.value)}
            />
          </div>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Generating Learning Path..." : "Generate Learning Path"}
          </Button>
          {error && <p className="text-red-500">{error}</p>}
        </CardContent>
      </Card>

      {recommendations && (
        <div className="mt-8 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight">Recommendations</h2>
          <p className="text-sm text-muted-foreground">
            Here are your AI generated personalized learning path recommendations.
          </p>
          <div className="grid gap-4 mt-4">
            <div>
              <h3 className="text-xl font-bold tracking-tight">Recommended Topics</h3>
              <ul>
                {recommendations.recommendedTopics.map((topic, index) => (
                  <li key={index}>
                    {topic.topic}: {topic.reason}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">Recommended Question Types</h3>
              <ul>
                {recommendations.recommendedQuestionTypes.map((questionType, index) => (
                  <li key={index}>
                    {questionType.questionType}: {questionType.reason}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">Summary</h3>
              <p>{recommendations.summary}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningPathPage;
