'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Dot,
} from 'recharts';
import {useAuth} from '@/components/auth-provider';
import {useState, useEffect} from 'react';
import {getGrades} from '@/lib/firebase'; // Assuming getGrades fetches all grade documents for a user
import {CheckCircle, Edit, ListChecks} from 'lucide-react';
import {Progress} from '@/components/ui/progress';
import {cn} from '@/lib/utils';
import { format } from 'date-fns'; // Import date-fns for formatting

// Define the structure of a grade document from Firestore
interface GradeData {
  id: string;
  taskName: string;
  score: number;
  feedback: string;
  timestamp: any; // Firebase Timestamp or Date object
}

// Define the structure for the chart data points
interface ChartDataPoint {
  date: string; // Formatted date for X-axis
  MCQ?: number;
  Essay?: number;
  LongAnswer?: number;
  Other?: number;
}

const ProgressPage = () => {
  const {user} = useAuth();
  const [grades, setGrades] = useState<GradeData[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate average scores and prepare chart data
  const processGradesData = (gradesData: GradeData[]) => {
    const scoresByType: Record<string, number[]> = {
      MCQ: [],
      Essay: [],
      LongAnswer: [],
      Other: [],
    };

    const chartPointsMap: Record<string, ChartDataPoint> = {};

    gradesData.forEach((grade: GradeData) => {
      const date = grade.timestamp?.toDate ? grade.timestamp.toDate() : new Date(grade.timestamp);
      const formattedDate = format(date, 'yyyy-MM-dd'); // Group by day

      if (!chartPointsMap[formattedDate]) {
        chartPointsMap[formattedDate] = { date: formattedDate };
      }

      // Determine task type (can be improved with more specific logic if needed)
      let taskType = 'Other';
      if (grade.taskName.toLowerCase().includes('mcq')) {
        taskType = 'MCQ';
      } else if (grade.taskName.toLowerCase().includes('essay')) {
        taskType = 'Essay';
      } else if (grade.taskName.toLowerCase().includes('long answer')) {
        taskType = 'LongAnswer';
      }

      scoresByType[taskType].push(grade.score);
       // Add or average score for the date and type
       // For simplicity, let's take the last score of the day for each type
      chartPointsMap[formattedDate][taskType as keyof ChartDataPoint] = grade.score;

    });

     // Convert map to array and sort by date
     const processedChartData = Object.values(chartPointsMap).sort(
       (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
     );
     setChartData(processedChartData);

     // Calculate average scores
     const calculateAverage = (scores: number[]) => {
       if (scores.length === 0) return 0;
       const sum = scores.reduce((acc, score) => acc + score, 0);
       return sum / scores.length;
     };

     return {
       averageMCQScore: calculateAverage(scoresByType.MCQ),
       averageEssayScore: calculateAverage(scoresByType.Essay),
       averageLongAnswerScore: calculateAverage(scoresByType.LongAnswer),
       averageOtherScore: calculateAverage(scoresByType.Other),
     };
  };


  useEffect(() => {
    const fetchGrades = async () => {
      if (!user) {
        setError('User not logged in.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const gradesData = (await getGrades(user.uid)) as GradeData[]; // Fetch grades for the logged-in user
        setGrades(gradesData); // Store raw grades if needed elsewhere
        processGradesData(gradesData); // Process data for display

      } catch (e: any) {
        setError(e.message || 'An error occurred while fetching grades.');
        console.error("Error fetching grades:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [user]); // Re-fetch when user changes

  const { averageMCQScore, averageEssayScore, averageLongAnswerScore } = processGradesData(grades);

  // Example course completion calculation (replace with actual logic if needed)
  const courseCompletion = grades.length > 0 ? (grades.length / 10) * 100 : 0; // Example: 10 tasks for full completion

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">My Progress</h1>
      {loading && <p>Loading progress...</p>}
      {error && <p className="text-red-500 mb-4">Error: {error}</p>}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average MCQ Score</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageMCQScore.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                   Based on {grades.filter(g => g.taskName.toLowerCase().includes('mcq')).length} attempts
                 </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Essay Score</CardTitle>
                <Edit className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageEssayScore.toFixed(1)}%</div>
                 <p className="text-xs text-muted-foreground">
                   Based on {grades.filter(g => g.taskName.toLowerCase().includes('essay')).length} attempts
                 </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Long Answer</CardTitle>
                <ListChecks className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageLongAnswerScore.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  Based on {grades.filter(g => g.taskName.toLowerCase().includes('long answer')).length} attempts
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="max-w-5xl mx-auto shadow-sm">
            <CardHeader>
              <CardTitle>Progress Tracker</CardTitle>
              <CardDescription>Visually track your scores over time.</CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 && <p>No progress data available to plot.</p>}
              {chartData.length > 0 && (
                <>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => format(new Date(value), 'MMM d')}
                      />
                      <YAxis
                         stroke="hsl(var(--muted-foreground))"
                         fontSize={12}
                         tickLine={false}
                         axisLine={false}
                         tickFormatter={(value) => `${value}%`}
                         domain={[0, 100]}
                      />
                      <Tooltip
                         contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' }}
                         labelStyle={{ color: 'hsl(var(--foreground))' }}
                         itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line
                        type="monotone"
                        dataKey="MCQ"
                        stroke="hsl(var(--chart-1))"
                        strokeWidth={2}
                        dot={<Dot r={4} fill="hsl(var(--chart-1))" stroke="hsl(var(--background))" />}
                        activeDot={{ r: 6, fill: 'hsl(var(--chart-1))' }}
                        connectNulls // Connect lines even if data points are missing for a date
                      />
                      <Line
                        type="monotone"
                        dataKey="Essay"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        dot={<Dot r={4} fill="hsl(var(--chart-2))" stroke="hsl(var(--background))" />}
                        activeDot={{ r: 6, fill: 'hsl(var(--chart-2))' }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="LongAnswer"
                        stroke="hsl(var(--chart-3))"
                        strokeWidth={2}
                        dot={<Dot r={4} fill="hsl(var(--chart-3))" stroke="hsl(var(--background))" />}
                        activeDot={{ r: 6, fill: 'hsl(var(--chart-3))' }}
                        connectNulls
                      />
                       <Line
                         type="monotone"
                         dataKey="Other"
                         stroke="hsl(var(--chart-4))"
                         strokeWidth={2}
                         dot={<Dot r={4} fill="hsl(var(--chart-4))" stroke="hsl(var(--background))" />}
                         activeDot={{ r: 6, fill: 'hsl(var(--chart-4))' }}
                         connectNulls
                       />
                    </LineChart>
                  </ResponsiveContainer>
                  {/* Removed course completion progress bar as it might not be meaningful without a defined course structure */}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ProgressPage;
