
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
  recommendedQuestionTypes: { questionType: string; reason: string; }[];
  summary: string; // Make summary required
}


const LearningPathPage = () => {
  const [performanceData, setPerformanceData] = useState("");
  const [learningStyle, setLearningStyle] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendations | null>(null); // Keep state as nullable
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, userClass, loading: authLoading } = useAuth(); // Get user, userClass, and auth loading state
  const { toast } = useToast(); // Use the toast hook
  // Removed JSON validation state as it's no longer needed
  // Handle performance data input change
  const handlePerformanceChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
     const value = e.target.value;
     setPerformanceData(value);
     // Clear any previous errors when the user types
     if (error) {
       setError(null);
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
     if (!performanceData.trim()) {
        setError("Please describe your performance.");
        toast({ variant: 'destructive', title: 'Missing Input', description: 'Please describe your performance.' });
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
      // Type assertion here assumes that the personalizeLearningPath function
      // is correctly implemented to return data matching the Recommendations interface
      // based on the GenKit schema definition.
      // If personalizeLearningPath is updated to guarantee non-optional fields,
      // this assertion might become unnecessary or the Recommendations interface
      // should be updated to match the *actual* return type.
      setRecommendations(result as Recommendations);
      toast({ title: 'Learning Path Generated', description: 'Recommendations are ready.' });
    } catch (e: any) {
      setError(e.message || "An error occurred while generating the learning path.");
      toast({ variant: 'destructive', title: 'Error Generating Path', description: e.message });
    } finally {
      setIsLoading(false);
    }
  };

   // Disable button state
   const isSubmitDisabled = isLoading || authLoading || !user || !userClass || !performanceData.trim();


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
                        Describe your recent performance and optional learning style to get AI-driven recommendations.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="performanceData" className="font-medium">Performance Description</Label>
                        <Textarea
                            id="performanceData"
                            placeholder='Describe your performance. e.g., "I did well on the Algebra MCQ (80%) but struggled with the Geometry long answer questions (50%). I find visual explanations helpful."'
                            value={performanceData}
                            onChange={handlePerformanceChange} // Use updated handler
                            rows={6} // Increased rows
                            className={`border-gray-300 focus:border-indigo-500 focus:ring-indigo-500`} // Removed conditional border class
                        />
                        <p className="text-xs text-muted-foreground">
                           Describe your strengths and weaknesses on recent topics or question types.
                        </p>
                         {/* Display errors */}
                         {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
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
                         <p>Enter your performance description to see recommendations here.</p>
                    </CardContent>
                 </Card>
              )}

        </motion.div>
    </>
  );
};

export default LearningPathPage;
