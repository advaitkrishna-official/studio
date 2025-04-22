"use client";

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

const data = [
  {
    name: "Week 1",
    correct: 40,
    incorrect: 10,
  },
  {
    name: "Week 2",
    correct: 30,
    incorrect: 20,
  },
  {
    name: "Week 3",
    correct: 20,
    incorrect: 30,
  },
  {
    name: "Week 4",
    correct: 27,
    incorrect: 18,
  },
  {
    name: "Week 5",
    correct: 18,
    incorrect: 22,
  },
  {
    name: "Week 6",
    correct: 23,
    incorrect: 17,
  },
  {
    name: "Week 7",
    correct: 34,
    incorrect: 6,
  },
  {
    name: "Week 8",
    correct: 40,
    incorrect: 0,
  },
  {
    name: "Week 9",
    correct: 20,
    incorrect: 10,
  },
  {
    name: "Week 10",
    correct: 30,
    incorrect: 5,
  },
];

const ProgressPage = () => {
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
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart
                data={data}
                margin={{
                  top: 10,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="correct" stroke="#82ca9d" fill="#82ca9d" name="Correct Answers" />
                <Area type="monotone" dataKey="incorrect" stroke="#e48080" fill="#e48080" name="Incorrect Answers" />
              </AreaChart>
            </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressPage;
