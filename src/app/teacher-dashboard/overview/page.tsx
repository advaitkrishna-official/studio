'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { generateOverview, GenerateOverviewOutput } from "@/ai/flows/generate-overview";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OverviewPage = () => {
  const [overview, setOverview] = useState<GenerateOverviewOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, userClass } = useAuth();
  const [selectedClass, setSelectedClass] = useState(userClass || ""); // Initialize with userClass
  const [classes, setClasses] = useState<string[]>(["Grade 8", "Grade 6", "Grade 4"]); // Static class options
  const [cachedStudentData, setCachedStudentData] = useState<any[]>([]);

  useEffect(() => {
    const fetchOverview = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!user) {
          setError("User not logged in.");
          return;
        }

        // Fetch student data from Firestore, filtered by selected class
        const studentsCollection = collection(db, "users");
        const q = query(studentsCollection, where("class", "==", selectedClass));
        const studentsSnapshot = await getDocs(q);
        const studentsData = studentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Cache student data
        localStorage.setItem('studentData', JSON.stringify(studentsData));
        setCachedStudentData(studentsData); // Also set it to state for immediate use

        const studentDataString = JSON.stringify(studentsData);
        const result = await generateOverview({
          teacherId: user.uid,
          studentData: studentDataString,
        });
        setOverview(result);
      } catch (e: any) {
        setError(e.message || "An error occurred while generating the overview.");
        // If offline, try to use cached data
        const cachedData = localStorage.getItem('studentData');
        if (cachedData) {
          try {
            const studentsData = JSON.parse(cachedData);
            setCachedStudentData(studentsData);
            const studentDataString = JSON.stringify(studentsData);
            const result = await generateOverview({
              teacherId: user.uid,
              studentData: studentDataString,
            });
            setOverview(result);
            setError("Offline mode: Using cached student data.");
          } catch (parseError: any) {
            setError(`Error parsing cached data: ${parseError.message}`);
          }
        } else {
          setError("Offline mode: No cached student data available.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchOverview();
  }, [user, selectedClass]);

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

          {/* Class Selection Dropdown */}
          <div className="grid gap-2">
            <label htmlFor="class">Select Class</label>
            <Select onValueChange={setSelectedClass} defaultValue={userClass}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              <div className="grid gap-2">
                <h3 className="text-xl font-bold tracking-tight">Suggested Activities</h3>
                <ul>
                  {overview.suggestedActivities.map((activity, index) => (
                    <li key={index}>{activity}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OverviewPage;
