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
import { motion } from 'framer-motion'; // For animations
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'; // For potential charts

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
  const { user, userClass, loading: authLoading } = useAuth(); // Get user, userClass, and auth loading state
  const { toast } = useToast(); // Use the toast hook
  const [isJsonValid, setIsJsonValid] = useState(true); // State to track JSON validity

  // Handle performance data input (basic validation for JSON structure)
  const handlePerformanceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
     const value = e.target.value;
     setPerformanceData(value);
     // Basic JSON validation feedback
     try {
       if (value.trim()) {
            JSON.parse(value);
            setError(null); // Clear error if JSON is valid
            setIsJsonValid(true);
       } else {
            setError(null); // Clear error if empty
            setIsJsonValid(true); // Consider empty string valid for now
       }
     } catch (jsonError) {
       setError("Performance data must be valid JSON.");
       setIsJsonValid(false);
     }
  };


  const handleSubmit = async () => {
    // Ensure user and userClass are available
    if (authLoading) {
      toast({ variant: 'destructive', title: 'Loading', description: 'Please wait for user data to load.' });
      return;
    }
    if (!user || !userClass) {
        setError("User information is not available. Please log in again.");
        toast({ variant: 'destructive', title: 'Error', description: 'User information missing.' });
        return;
    }
    // Re-validate JSON before submitting, although handlePerformanceChange should catch it
     try {
       if (performanceData.trim()) JSON.parse(performanceData);
     } catch (jsonError) {
       setError("Performance data must be valid JSON.");
       toast({ variant: 'destructive', title: 'Invalid Input', description: 'Performance data must be valid JSON.' });
       return;
     }

    setIsLoading(true);
    setError(null);
    setIsJsonValid(true); // Assume valid until AI call, clear previous validation errors
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

   // Disable button state
   const isSubmitDisabled = isLoading || authLoading || !user || !userClass || !performanceData.trim() || !isJsonValid;


  return (
     // Container and layout handled by src/app/student-dashboard/layout.tsx
    <>
        <h1 className="text-3xl font-bold mb-4">Personalized Learning Path</h1>
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
        >
            {/* Input Card */}
            <Card className="shadow-lg border border-gray-200">
                <CardHeader>
                    <CardTitle>Generate Your Path</CardTitle>
                    <CardDescription>
                        Enter your performance data and optional learning style to get AI-driven recommendations.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="performanceData" className="font-medium">Performance Data (JSON Format)</Label>
                        <Textarea
                            id="performanceData"
                            placeholder='Example: {"topics": {"Algebra": 75, "Geometry": 50}, "questionTypes": {"MCQ": 80, "LongAnswer": 60}}'
                            value={performanceData}
                            onChange={handlePerformanceChange} // Use handler for validation
                            rows={6} // Increased rows
                            className={`border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 ${!isJsonValid ? 'border-red-500 focus:ring-red-500' : ''}`} // Conditional red border
                        />
                        <p className="text-xs text-muted-foreground">
                            Provide data on topics/questions attempted and accuracy (%). Ensure it's valid JSON.
                        </p>
                         {/* Display JSON validation error clearly */}
                         {!isJsonValid && error && <p className="text-sm text-red-600 mt-1">{error}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="learningStyle" className="font-medium">Learning Style (Optional)</Label>
                        <Input
                            id="learningStyle"
                            placeholder="e.g., visual, auditory, kinesthetic"
                            value={learningStyle}
                            onChange={(e) => setLearningStyle(e.target.value)}
                             className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                        />
                    </div>

                    <Button onClick={handleSubmit} disabled={isSubmitDisabled} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 disabled:opacity-50">
                        {isLoading ? "Generating Learning Path..." : "Generate Learning Path"}
                    </Button>
                    {/* Display other errors (non-JSON validation) */}
                    {error && isJsonValid && <p className="text-red-600 mt-2 text-center">{error}</p>}
                </CardContent>
            </Card>

             {/* Recommendations Card */}
             {recommendations && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                    <Card className="shadow-lg border border-gray-200 h-full flex flex-col"> {/* Added h-full and flex */}
                        <CardHeader>
                            <CardTitle>Your Personalized Recommendations</CardTitle>
                             <CardDescription>Focus on these areas to improve.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6 flex-1"> {/* Added flex-1 */}
                            <div>
                                <h3 className="text-lg font-semibold mb-2 text-gray-800">Summary</h3>
                                <p className="text-muted-foreground text-sm">{recommendations.summary}</p>
                            </div>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                 <div>
                                     <h3 className="text-lg font-semibold mb-2 text-gray-800">Recommended Topics</h3>
                                     <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm">
                                         {recommendations.recommendedTopics.map((topic, index) => (
                                             <li key={index}>
                                                 <strong>{topic.topic}:</strong> {topic.reason}
                                             </li>
                                         ))}
                                     </ul>
                                 </div>
                                 <div>
                                     <h3 className="text-lg font-semibold mb-2 text-gray-800">Recommended Question Types</h3>
                                     <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-sm">
                                         {recommendations.recommendedQuestionTypes.map((qt, index) => (
                                             <li key={index}>
                                                 <strong>{qt.questionType}:</strong> {qt.reason}
                                             </li>
                                         ))}
                                     </ul>
                                 </div>
                             </div>
                             {/* Optional: Add a simple chart visualization if data allows */}
                             {/* Example:
                             <div className="mt-4">
                                <h3 className="text-lg font-semibold mb-2 text-gray-800">Topic Strength (Example)</h3>
                                <ResponsiveContainer width="100%" height={150}>
                                  <BarChart data={[{name: 'Algebra', score: 75}, {name: 'Geometry', score: 50}]}>
                                    <XAxis dataKey="name" fontSize={10} />
                                    <YAxis domain={[0, 100]} fontSize={10} />
                                    <Tooltip />
                                    <Bar dataKey="score" fill="#4f46e5" />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                              */}
                        </CardContent>
                    </Card>
                </motion.div>
             )}
              {/* Placeholder when no recommendations yet */}
              {!recommendations && !isLoading && (
                 <Card className="shadow-lg border border-gray-200 h-full flex items-center justify-center">
                    <CardContent className="text-center text-gray-500">
                         <p>Enter your data to see recommendations here.</p>
                    </CardContent>
                 </Card>
              )}

        </motion.div>
    </>
  );
};

export default LearningPathPage;
