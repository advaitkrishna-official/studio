
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Chart,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  useChart,
  ChartStyle,
} from "@/components/ui/chart";
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useAuth } from "@/components/auth-provider";
import { useState, useEffect } from "react";
import { getGrades } from "@/lib/firebase";

const ProgressPage = () => {
  const { user } = useAuth();
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
        setError(e.message || "An error occurred while fetching grades.");
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [user]);

  // Transform grades data for recharts
  const chartData = grades.map((grade) => ({
    name: grade.taskName,
    score: grade.score,
  }));

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle>Progress Tracker</CardTitle>
          <CardDescription>
            Visually track your progress through different topics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && <p>Loading progress...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!loading && grades.length === 0 && <p>No progress data available.</p>}
          {!loading && grades.length > 0 && (
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="score" stroke="#82ca9d" fill="#82ca9d" name="Score" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressPage;
