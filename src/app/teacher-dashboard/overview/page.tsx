"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { generateOverview, GenerateOverviewOutput } from "@/ai/flows/generate-overview";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

const OverviewPage = () => {
  const [overview, setOverview] = useState<GenerateOverviewOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchOverview = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!user) {
          setError("User not logged in.");
          return;
        }

        // Fetch student data from Firestore
        const studentsCollection = collection(db, "users");
        const studentsSnapshot = await getDocs(studentsCollection);
        const studentsData = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        const studentDataString = JSON.stringify(studentsData);
        const result = await generateOverview({
          teacherId: user.uid,
          studentData: studentDataString,
        });
        setOverview(result);
      } catch (e: any) {
        setError(e.message || "An error occurred while generating the overview.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
  }, [user]);

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
          <CardDescription>
            Here is an overview of your students' performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {isLoading && <p>Loading overview...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {overview && (
            <>
              <div className="grid gap-2">
                <h3 className="text-xl font-bold tracking-tight">Total Students</h3>
                <p>{overview.totalStudents}</p>
              </div>
              <div className="grid gap-2">
                <h3 className="text-xl font-bold tracking-tight">Recent Activities</h3>
                <ul>
                  {overview.recentActivities.map((activity, index) => (
                    <li key={index}>{activity}</li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-2">
                <h3 className="text-xl font-bold tracking-tight">Performance Summary</h3>
                <p>{overview.performanceSummary}</p>
              </div>
               <div className="grid gap-2">
                <h3 className="text-xl font-bold tracking-tight">AI Insights</h3>
                <p>{overview.insights}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewPage;
