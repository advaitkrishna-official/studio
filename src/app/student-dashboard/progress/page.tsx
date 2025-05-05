
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Dot
} from 'recharts'; // Added BarChart, Bar
import {useAuth} from '@/components/auth-provider';
import {useState, useEffect} from 'react';
import {getGrades, GradeData} from '@/lib/firebase'; // Assuming getGrades fetches all grade documents for a user
import {CheckCircle, Edit, ListChecks} from 'lucide-react';
import {Progress as UiProgress} from '@/components/ui/progress'; // Renamed to avoid conflict
import {cn} from '@/lib/utils';
import { format } from 'date-fns'; // Import date-fns for formatting
import { motion } from 'framer-motion'; // For animations

// Define the structure for the chart data points (consistent across charts)
interface ChartDataPoint {
  date: string; // Formatted date for X-axis
  name: string; // Task name or generic category for Bar chart
  MCQ?: number;
  Essay?: number;
  LongAnswer?: number;
  Other?: number;
  score?: number; // Generic score for Bar chart
}

const ProgressPage = () => {
  const {user, loading: authLoading} = useAuth(); // Get auth loading state
  const [grades, setGrades] = useState<GradeData[]>([]);
  const [lineChartData, setLineChartData] = useState<ChartDataPoint[]>([]);
  const [barChartData, setBarChartData] = useState<ChartDataPoint[]>([]); // Data for Bar chart
  const [averageScores, setAverageScores] = useState({
      averageMCQScore: 0,
      averageEssayScore: 0,
      averageLongAnswerScore: 0,
      averageOtherScore: 0,
      overallAverage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate average scores and prepare chart data
   const processGradesData = (gradesData: GradeData[]) => {
     const scoresByType: Record<string, number[]> = { MCQ: [], Essay: [], LongAnswer: [], Other: [] };
     const linePointsMap: Record<string, ChartDataPoint> = {};
     const barPoints: ChartDataPoint[] = []; // For individual task scores

     let totalScoreSum = 0;
     let validGradeCount = 0;

     gradesData.forEach((grade: GradeData) => {
       const score = Number(grade.score); // Ensure score is a number
       if (isNaN(score)) return; // Skip if score is not a valid number

       const date = grade.timestamp?.toDate ? grade.timestamp.toDate() : new Date(grade.timestamp || Date.now()); // Ensure date is valid
       if (!(date instanceof Date) || isNaN(date.getTime())) return; // Skip if date is invalid

       const formattedDate = format(date, 'yyyy-MM-dd'); // Group by day for line chart

       if (!linePointsMap[formattedDate]) {
         linePointsMap[formattedDate] = { date: formattedDate, name: formattedDate }; // Initialize point for the day
       }

       // Determine task type
       let taskType: keyof typeof scoresByType = 'Other';
       const taskNameLower = grade.taskName.toLowerCase();
       if (taskNameLower.includes('mcq')) taskType = 'MCQ';
       else if (taskNameLower.includes('essay')) taskType = 'Essay';
       else if (taskNameLower.includes('long answer')) taskType = 'LongAnswer';

       scoresByType[taskType].push(score);
       totalScoreSum += score;
       validGradeCount++;

       // Add/Update score for the specific type on that date for the line chart
       linePointsMap[formattedDate][taskType] = score; // Could be last score or average for the day if multiple

       // Add data point for the bar chart (individual tasks)
       barPoints.push({ date: formattedDate, name: grade.taskName, score: score });
     });

     // Convert line chart map to array and sort by date
     const processedLineData = Object.values(linePointsMap).sort(
       (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
     );
     setLineChartData(processedLineData);

      // Sort bar chart data by date as well
      const processedBarData = barPoints.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
     setBarChartData(processedBarData.slice(-10)); // Limit bar chart to last 10 tasks for clarity

     // Calculate average scores
     const calculateAverage = (scores: number[]) => scores.length === 0 ? 0 : scores.reduce((acc, s) => acc + s, 0) / scores.length;

     setAverageScores({
       averageMCQScore: calculateAverage(scoresByType.MCQ),
       averageEssayScore: calculateAverage(scoresByType.Essay),
       averageLongAnswerScore: calculateAverage(scoresByType.LongAnswer),
       averageOtherScore: calculateAverage(scoresByType.Other),
       overallAverage: validGradeCount === 0 ? 0 : totalScoreSum / validGradeCount,
     });
   };


  useEffect(() => {
    const fetchGrades = async () => {
      if (authLoading) return; // Wait for auth to finish loading
      if (!user) {
        setError('User not logged in.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        console.log("Fetching grades for user:", user.uid); // Debug log
        const gradesData = (await getGrades(user.uid)) as GradeData[]; // Fetch grades
        console.log("Fetched grades data:", gradesData); // Debug log
        setGrades(gradesData); // Store raw grades
        processGradesData(gradesData); // Process data for display

      } catch (e: any) {
        setError(e.message || 'An error occurred while fetching grades.');
        console.error("Error fetching grades:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [user, authLoading]); // Re-fetch when user or authLoading changes


  if (authLoading || loading) {
      return (
          <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
             <span className="loader"></span>
          </div>
      );
  }

  return (
    // Container and layout handled by src/app/student-dashboard/layout.tsx
    <>
        <h1 className="text-3xl font-bold mb-6">My Progress</h1>
        {error && <p className="text-red-500 mb-4 text-center">Error: {error}</p>}
        {!loading && !error && (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-8"
            >
                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="shadow-md border border-gray-200">
                         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                             <CardTitle className="text-sm font-medium text-gray-600">Overall Average</CardTitle>
                             <LineChart className="h-4 w-4 text-indigo-500" />
                         </CardHeader>
                         <CardContent>
                             <div className="text-3xl font-bold text-indigo-600">{averageScores.overallAverage.toFixed(1)}%</div>
                             <p className="text-xs text-muted-foreground">
                                Average across all {grades.length} graded tasks
                              </p>
                         </CardContent>
                    </Card>
                    <Card className="shadow-md border border-gray-200">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-gray-600">Average MCQ Score</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-green-600">{averageScores.averageMCQScore.toFixed(1)}%</div>
                            <p className="text-xs text-muted-foreground">
                                Based on {grades.filter(g => g.taskName.toLowerCase().includes('mcq')).length} attempts
                            </p>
                        </CardContent>
                    </Card>
                     {/* Add similar cards for Essay and Long Answer if needed */}
                    <Card className="shadow-md border border-gray-200">
                         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                             <CardTitle className="text-sm font-medium text-gray-600">Average Long Answer</CardTitle>
                             <ListChecks className="h-4 w-4 text-blue-500" />
                         </CardHeader>
                         <CardContent>
                             <div className="text-3xl font-bold text-blue-600">{averageScores.averageLongAnswerScore.toFixed(1)}%</div>
                              <p className="text-xs text-muted-foreground">
                                 Based on {grades.filter(g => g.taskName.toLowerCase().includes('long answer')).length} attempts
                              </p>
                         </CardContent>
                    </Card>
                </div>

                 {/* Recent Scores Bar Chart */}
                 <Card className="shadow-lg border border-gray-200">
                     <CardHeader>
                       <CardTitle>Recent Task Scores</CardTitle>
                       <CardDescription>Scores from your last 10 graded tasks.</CardDescription>
                     </CardHeader>
                     <CardContent>
                       {barChartData.length === 0 ? (
                           <p className="text-center text-gray-500 py-8">No recent scores to display.</p>
                       ) : (
                         <ResponsiveContainer width="100%" height={300}>
                           <BarChart data={barChartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                             <XAxis
                                dataKey="name" // Show task name on X-axis
                                stroke="hsl(var(--muted-foreground))"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                interval={0} // Show all labels if possible, adjust if too cluttered
                                angle={-30} // Angle labels if they overlap
                                textAnchor="end"
                                height={50} // Increase height for angled labels
                              />
                             <YAxis
                               stroke="hsl(var(--muted-foreground))"
                               fontSize={10}
                               tickLine={false}
                               axisLine={false}
                               tickFormatter={(value) => `${value}%`}
                               domain={[0, 100]}
                             />
                             <Tooltip
                                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.5 }}
                                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px' }}
                                labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                                itemStyle={{ color: 'hsl(var(--foreground))' }}
                                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']} // Format tooltip
                              />
                             <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={20} />
                           </BarChart>
                         </ResponsiveContainer>
                       )}
                     </CardContent>
                 </Card>

                {/* Progress Over Time Line Chart */}
                <Card className="shadow-lg border border-gray-200">
                    <CardHeader>
                        <CardTitle>Score Trends Over Time</CardTitle>
                        <CardDescription>Track your performance in different task types.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {lineChartData.length === 0 ? (
                            <p className="text-center text-gray-500 py-8">Not enough data to show trends yet.</p>
                        ) : (
                            <ResponsiveContainer width="100%" height={350}>
                                <LineChart data={lineChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="hsl(var(--foreground))" // Use foreground color for better visibility
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={{ stroke: "hsl(var(--border))" }} // Add axis line
                                        tickFormatter={(value) => format(new Date(value + 'T00:00:00'), 'MMM d')} // Ensure correct date parsing
                                     />
                                    <YAxis
                                        stroke="hsl(var(--foreground))" // Use foreground color
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={{ stroke: "hsl(var(--border))" }} // Add axis line
                                        tickFormatter={(value) => `${value}%`}
                                        domain={[0, 100]}
                                     />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)', fontSize: '12px' }}
                                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                                     />
                                    <Legend wrapperStyle={{ fontSize: '12px', color: 'hsl(var(--foreground))' }} />
                                    <Line name="MCQ Score" type="monotone" dataKey="MCQ" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: 'hsl(var(--chart-1))' }} connectNulls />
                                    <Line name="Essay Score" type="monotone" dataKey="Essay" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: 'hsl(var(--chart-2))' }} connectNulls />
                                    <Line name="Long Answer Score" type="monotone" dataKey="LongAnswer" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: 'hsl(var(--chart-3))' }} connectNulls />
                                    <Line name="Other Score" type="monotone" dataKey="Other" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} activeDot={{ r: 5, fill: 'hsl(var(--chart-4))' }} connectNulls />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        )}
    </>
  );
};

export default ProgressPage;
