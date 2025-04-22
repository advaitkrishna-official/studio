'use client';

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {useAuth} from '@/components/auth-provider';
import {useState, useEffect} from 'react';
import {getGrades} from '@/lib/firebase';

const ProgressPage = () => {
  const {user} = useAuth();
  const [grades, setGrades] = useState([]);
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

  // Transform grades data for recharts
  const chartData = grades.map(grade => ({
    name: grade.taskName,
    score: grade.score,
  }));

  return (
    <div className="container mx-auto py-8">
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
            <ResponsiveContainer width="100%" height={400} className="chart-labels">
              <BarChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressPage;
