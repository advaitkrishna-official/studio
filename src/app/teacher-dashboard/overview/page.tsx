'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  DocumentData // Import DocumentData
} from 'firebase/firestore';
import { generateOverview, GenerateOverviewOutput } from '@/ai/flows/generate-overview';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // Removed AvatarImage
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { User, Activity, BarChart2 } from 'lucide-react'; // Import icons

// Define student data type more accurately
type StudentData = {
  id: string;
  name?: string; // Make name optional
  email: string; // Assume email is always present
  class?: string; // Make class optional
  progress?: number | Record<string, number>; // Can be a single number or an object
  lastActivity?: string;
  overallProgress?: number; // Calculated property
};


export default function OverviewPage() {
  const { user } = useAuth(); // Removed userClass as we fetch all students now
  const [studentData, setStudentData] = useState<StudentData[]>([]);
  const [overview, setOverview] = useState<GenerateOverviewOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!user) {
       setLoading(false); // Stop loading if no user
       setError("User not logged in.");
       return;
    }

    setLoading(true);
    setError(null);

    // Query all students (remove class filter for now)
    // In a real app, you might filter by teacherId or fetch students from multiple assigned classes.
    const q = query(
      collection(db, 'Users'), // Assuming 'Users' collection stores students
      where('role', '==', 'student') // Ensure we only get students
    );

    const unsub = onSnapshot(q, async (snap) => {
      const data: StudentData[] = snap.docs.map(doc => {
        const docData = doc.data() as DocumentData;
        let overallProgress = 0;
        // Calculate overall progress: handle both number and object types
        if (typeof docData.progress === 'number') {
           overallProgress = docData.progress;
        } else if (typeof docData.progress === 'object' && docData.progress !== null) {
            const scores = Object.values(docData.progress).filter(s => typeof s === 'number') as number[];
            overallProgress = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        }

        return {
          id: doc.id,
          email: docData.email || 'No Email', // Default value
          name: docData.name, // Optional
          class: docData.class, // Optional
          progress: docData.progress, // Store original progress data
          overallProgress: Math.min(100, Math.max(0, overallProgress)), // Calculated and capped
          lastActivity: docData.lastActivity || 'No recent activity', // Default value
        };
      });

      setStudentData(data);
      setLoading(false); // Data fetched, stop loading

      // Generate AI overview if data exists
      if (data.length > 0) {
        setAiLoading(true);
        setError(null); // Clear previous errors before AI call
        try {
          const overviewResult = await generateOverview({
            teacherId: user.uid,
            studentData: JSON.stringify(data), // Pass all fetched student data
            // Removed grade as we are showing all students
          });
          setOverview(overviewResult);
        } catch (e: any) {
          console.error("Error generating AI overview:", e);
          setError(`Failed to generate AI insights: ${e.message}`);
          setOverview(null); // Clear overview on error
        } finally {
          setAiLoading(false);
        }
      } else {
         setOverview(null); // No students, no overview
      }

    }, e => {
      console.error("Error fetching students:", e);
      setError(e.message || "Failed to fetch student data.");
      setLoading(false);
      setStudentData([]); // Clear data on error
      setOverview(null);
    });

    return () => unsub();
  }, [user]); // Depend only on user

  // Metrics - recalculated whenever studentData changes
  const totalStudents = studentData.length;
  const avgPerf = totalStudents > 0
    ? studentData.reduce((sum, s) => sum + (s.overallProgress ?? 0), 0) / totalStudents
    : 0;
  const activePct = totalStudents > 0
    ? studentData.filter(s => (s.overallProgress ?? 0) > 50).length / totalStudents * 100
    : 0;

  // Performance Distribution - recalculated whenever studentData changes
  const bins = [0, 20, 40, 60, 80, 101]; // Include 100 in the last bin
  const distData = bins.slice(0, -1).map((min, i) => {
    const max = bins[i+1];
    const count = studentData.filter(s => (s.overallProgress ?? 0) >= min && (s.overallProgress ?? 0) < max).length;
    return { name: `${min}-${max === 101 ? 100 : max-1}%`, count }; // Adjust label for last bin
  });

  // Get initials for Avatar Fallback
  const getInitials = (email: string) => email?.[0]?.toUpperCase() ?? '?';


  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Class Overview</h1>
        {/* Removed Class Selector */}
      </div>

       {/* Loading and Error States */}
        {loading && <p className="text-center text-muted-foreground py-4">Loading student data...</p>}
        {error && <p className="text-center text-red-500 py-4">Error: {error}</p>}


      {/* Display content only when not loading and no error */}
      {!loading && !error && (
         <>
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { title: 'Total Students', value: totalStudents, icon: <User className="h-6 w-6 text-blue-500" /> },
                  { title: 'Avg. Performance', value: `${avgPerf.toFixed(1)}%`, icon: <BarChart2 className="h-6 w-6 text-green-500" />, progress: avgPerf },
                  { title: 'Active Engagement (>50%)', value: `${activePct.toFixed(0)}%`, icon: <Activity className="h-6 w-6 text-orange-500" />, progress: activePct }
                ].map(({ title, value, icon, progress }) => (
                  <motion.div
                    key={title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Card className="shadow-sm hover:shadow-md transition-shadow border border-gray-200">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                        {icon}
                      </CardHeader>
                      <CardContent>
                         <div className="text-2xl font-bold">{value}</div>
                         {typeof progress === 'number' && (
                          <Progress value={Math.min(Math.max(progress, 0), 100)} className="w-full h-2 mt-2" />
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Performance Distribution */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <Card className="shadow-sm border border-gray-200">
                  <CardHeader>
                    <CardTitle>Performance Distribution</CardTitle>
                    <CardDescription>How students scores spread across ranges.</CardDescription>
                  </CardHeader>
                  <CardContent className="h-64">
                    {studentData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={distData} margin={{ top: 5, right: 0, bottom: 0, left: -25 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                           <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false}/>
                           <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`}/>
                           <Tooltip
                             cursor={{ fill: 'hsl(var(--muted))' }}
                             contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                           />
                          <Bar dataKey="count" name="Students" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                       <p className="text-center text-muted-foreground py-8">No student data to display distribution.</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* AI Insights & Recent Activities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <motion.div
                   initial={{ x: -20, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   transition={{ duration: 0.4 }}
                 >
                   <Card className="shadow-sm border border-gray-200 h-full">
                     <CardHeader>
                       <CardTitle>AI Insights & Suggestions</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-3">
                        {aiLoading && <p className="text-muted-foreground">Generating AI insights...</p>}
                        {overview && !aiLoading ? (
                           <>
                            <div>
                               <h4 className="font-semibold mb-1 text-sm">Performance Summary:</h4>
                               <p className="text-sm text-muted-foreground">{overview.performanceSummary}</p>
                            </div>
                            <div>
                               <h4 className="font-semibold mb-1 text-sm">Insights:</h4>
                               <p className="text-sm text-muted-foreground">{overview.insights}</p>
                            </div>
                            <div>
                               <h4 className="font-semibold mb-1 text-sm">Suggested Activities:</h4>
                               <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                                 {overview.suggestedActivities?.map((act, i) => (
                                   <li key={i}>{act}</li>
                                 ))}
                               </ul>
                            </div>
                           </>
                         ) : !aiLoading && (
                            <p className="text-sm text-muted-foreground">{error ? `Could not generate insights: ${error}` : "No AI insights available. Need more student data."}</p>
                         )}
                     </CardContent>
                   </Card>
                 </motion.div>

                <motion.div
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.4 }}
                >
                   <Card className="shadow-sm border border-gray-200 h-full">
                    <CardHeader>
                      <CardTitle>Recent Student Activities</CardTitle>
                      <CardDescription>Latest actions from your students.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-48 pr-4">
                        {studentData.length > 0 ? (
                          <ul className="space-y-3">
                            {/* Display actual recent activities if available, otherwise placeholder */}
                            {studentData
                              .filter(s => s.lastActivity && s.lastActivity !== 'No recent activity') // Filter students with actual activity
                              .slice(0, 10) // Limit display
                              .map((student) => (
                                <li key={student.id} className="flex items-center gap-3 text-sm">
                                   <Avatar className="h-6 w-6">
                                      {/* Add AvatarImage if student profile picture URL exists */}
                                      <AvatarFallback className="text-xs">{getInitials(student.email)}</AvatarFallback>
                                   </Avatar>
                                   <span className="text-muted-foreground flex-1 truncate">{student.email}: {student.lastActivity}</span>
                                   {/* Optionally add timestamp here */}
                                </li>
                            ))}
                            {/* Show placeholder if no students have recent activity */}
                            {studentData.every(s => !s.lastActivity || s.lastActivity === 'No recent activity') && (
                               <p className="text-muted-foreground text-sm">No recent student activities recorded.</p>
                            )}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground text-sm">No students in this view yet.</p>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                 </motion.div>
              </div>
         </>
      )}
    </div>
  );
}
