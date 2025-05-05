'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CheckCircle, ListChecks, LineChart as LineIcon } from 'lucide-react';
import { Progress as UiProgress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/auth-provider';
import { getGrades } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';

interface GradeData {
  id: string;
  taskName: string;
  score: number;
  feedback: string;
  timestamp: Timestamp | Date;
}

interface ChartDataPoint {
  date: string;
  name: string;
  MCQ?: number;
  Essay?: number;
  LongAnswer?: number;
  Other?: number;
  score?: number; // for bar chart
}

const ProgressPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  const [grades, setGrades] = useState<GradeData[]>([]);
  const [lineChartData, setLineChartData] = useState<ChartDataPoint[]>([]);
  const [barChartData, setBarChartData] = useState<ChartDataPoint[]>([]);
  const [averageScores, setAverageScores] = useState({
    averageMCQScore: 0,
    averageEssayScore: 0,
    averageLongAnswerScore: 0,
    averageOtherScore: 0,
    overallAverage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isTimestamp = (value: any): value is Timestamp =>
    value instanceof Timestamp;

  const processGradesData = (gradesData: GradeData[]) => {
    const scoresByType: Record<string, number[]> = {
      MCQ: [],
      Essay: [],
      LongAnswer: [],
      Other: [],
    };
    const linePointsMap: Record<string, ChartDataPoint> = {};
    const barPoints: ChartDataPoint[] = [];

    let totalScoreSum = 0;
    let validGradeCount = 0;

    gradesData.forEach((grade) => {
      const score = Number(grade.score);
      if (isNaN(score)) return;

      const dateObj = isTimestamp(grade.timestamp)
        ? grade.timestamp.toDate()
        : grade.timestamp;
      if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return;

      const formattedDate = format(dateObj, 'yyyy-MM-dd');
      if (!linePointsMap[formattedDate]) {
        linePointsMap[formattedDate] = { date: formattedDate, name: formattedDate };
      }

      let taskType: keyof typeof scoresByType = 'Other';
      const lower = grade.taskName.toLowerCase();
      if (lower.includes('mcq')) taskType = 'MCQ';
      else if (lower.includes('essay')) taskType = 'Essay';
      else if (lower.includes('long answer')) taskType = 'LongAnswer';

      scoresByType[taskType].push(score);
      totalScoreSum += score;
      validGradeCount++;

      linePointsMap[formattedDate][taskType] = score;
      barPoints.push({ date: formattedDate, name: grade.taskName, score });
    });

    const processedLineData = Object.values(linePointsMap).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    setLineChartData(processedLineData);

    const processedBarData = barPoints.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    setBarChartData(processedBarData.slice(-10));

    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    setAverageScores({
      averageMCQScore: avg(scoresByType.MCQ),
      averageEssayScore: avg(scoresByType.Essay),
      averageLongAnswerScore: avg(scoresByType.LongAnswer),
      averageOtherScore: avg(scoresByType.Other),
      overallAverage: validGradeCount ? totalScoreSum / validGradeCount : 0,
    });
  };

  useEffect(() => {
    const fetch = async () => {
      if (authLoading) return;
      if (!user) {
        setError('Not logged in.');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getGrades(user.uid);
        setGrades(data);
        processGradesData(data);
      } catch (e: any) {
        setError(e.message || 'Failed to fetch grades.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span>Loading…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        Error: {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold"
      >
        My Progress
      </motion.h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex justify-between">
            <CardTitle>Overall Average</CardTitle>
            <LineIcon />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {averageScores.overallAverage.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">
              Across {grades.length} graded tasks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between">
            <CardTitle>MCQ Avg</CardTitle>
            <CheckCircle />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">
              {averageScores.averageMCQScore.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">
              Based on{' '}
              {grades.filter((g) =>
                g.taskName.toLowerCase().includes('mcq')
              ).length}{' '}
              attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex justify-between">
            <CardTitle>Long Answer Avg</CardTitle>
            <ListChecks />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">
              {averageScores.averageLongAnswerScore.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">
              Based on{' '}
              {grades.filter((g) =>
                g.taskName.toLowerCase().includes('long answer')
              ).length}{' '}
              attempts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Task Scores</CardTitle>
          <CardDescription>Last 10 graded tasks</CardDescription>
        </CardHeader>
        <CardContent>
          {barChartData.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No recent scores
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                  height={50}
                />
                <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="score" fill="#4f46e5" barSize={20} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Line Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Score Trends Over Time</CardTitle>
          <CardDescription>Performance by task type</CardDescription>
        </CardHeader>
        <CardContent>
          {lineChartData.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Not enough data
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={lineChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => format(new Date(d + 'T00:00:00'), 'MMM d')}
                />
                <YAxis tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend />
                <Line type="monotone" dataKey="MCQ" stroke="#10b981" dot={false} />
                <Line type="monotone" dataKey="Essay" stroke="#3b82f6" dot={false} />
                <Line type="monotone" dataKey="LongAnswer" stroke="#8b5cf6" dot={false} />
                <Line type="monotone" dataKey="Other" stroke="#f43f5e" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressPage;
