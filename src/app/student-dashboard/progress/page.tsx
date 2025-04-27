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
import {getGrades} from '@/lib/firebase';
import {CheckCircle, Edit, ListChecks} from 'lucide-react';
import {Progress} from '@/components/ui/progress';
import {cn} from '@/lib/utils';

const ProgressPage = () => {
  const {user} = useAuth();
  const [grades, setGrades] = useState<{
    id: string;
  }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGrades = async () => {
      setLoading(true);
      setError(null);
      try {
        if (user) {
          const gradesData = await getGrades(user.uid);
          setGrades(gradesData);

        }
      } catch (e: any) {
        setError(e.message || 'An error occurred while fetching grades.');
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [user]);

  // Calculate average scores
  const calculateAverageScore = (taskName: string) => {
    const taskGrades = grades.filter((grade: any) =>
      grade.taskName.includes(taskName)
    );
    if (taskGrades.length === 0) return 0;
    const totalScore = taskGrades.reduce(
      (sum: number, grade: any) => sum + grade.score,
      0
    );
    return totalScore / taskGrades.length;
  };

  const averageMCQScore = calculateAverageScore('MCQ');
  const averageEssayScore = calculateAverageScore('Essay');
  const averageLongAnswerScore = calculateAverageScore('Long Answer');
  const courseCompletion = 70;

  // Mock data for the line chart
  const data = [
    {testDate: '80', MCQ: 45, Essay: 30, LongAnswer: 35},
    {testDate: '40', MCQ: 80, Essay: 50, LongAnswer: 30},
    {testDate: '60', MCQ: 40, Essay: 50, LongAnswer: 70},
    {testDate: '70', MCQ: 30, Essay: 80, LongAnswer: 60},
  ];

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average MCQ Score</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageMCQScore.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Essay Score</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageEssayScore.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Long Answer</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageLongAnswerScore.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle>Progress Tracker</CardTitle>
          <CardDescription>Visually track your progress through different topics.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <p>Loading progress...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!loading && grades.length === 0 && <p>No progress data available.</p>}
          {!loading && grades.length > 0 && (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="testDate" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="MCQ"
                    stroke="hsl(var(--chart-1))"
                    strokeWidth={2}
                    dot={<Dot r={5} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="Essay"
                    stroke="hsl(var(--chart-2))"
                    strokeWidth={2}
                    dot={<Dot r={5} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="LongAnswer"
                    stroke="hsl(var(--chart-3))"
                    strokeWidth={2}
                    dot={<Dot r={5} />}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mb-4">
                Course Completion
                <Progress value={courseCompletion} className="mt-2" />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressPage;
