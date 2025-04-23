'use client';

import {useState, useEffect} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {generateOverview, GenerateOverviewOutput} from "@/ai/flows/generate-overview";
import {useAuth} from "@/components/auth-provider";
import {db} from "@/lib/firebase";
import {collection, getDocs, query, where} from "firebase/firestore";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {Badge} from "@/components/ui/badge";
import {Icons} from "@/components/icons";

const OverviewPage = () => {
  const [overview, setOverview] = useState<GenerateOverviewOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {user, userClass} = useAuth();
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

  const avgPerformance = overview?.performanceSummary ? parseFloat(overview.performanceSummary.match(/(\d+(\.\d+)?)%/)?.[1] || "0") : 0;
  const totalStudents = overview?.totalStudents || 0;

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Overview</h1>
        <Select onValueChange={setSelectedClass} defaultValue={userClass}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Class" />
          </SelectTrigger>
          <SelectContent>
            {classes.map((cls) => (
              <SelectItem key={cls} value={cls}>{cls}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center space-y-2 p-6">
            <Avatar className="h-16 w-16">
              <AvatarImage src="https://picsum.photos/seed/picsum/200/200" alt="Total Students" />
              <AvatarFallback>TS</AvatarFallback>
            </Avatar>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <div className="text-muted-foreground">Total Students</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center space-y-2 p-6">
            <div className="text-2xl font-bold">{avgPerformance}%</div>
            <div className="text-muted-foreground">Avg Performance</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center space-y-2 p-6">
            <div className="text-2xl font-bold">75%</div>
            <div className="text-muted-foreground">Active Engagement</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
          </CardHeader>
          <CardContent className="list-disc pl-5">
            {isLoading && <p>Loading recent activities...</p>}
            {error && <p className="text-red-500">{error}</p>}
            {overview && overview.recentActivities.length > 0 ? (
              <ul>
                {overview.recentActivities.map((activity, index) => (
                  <li key={index}>{activity}</li>
                ))}
              </ul>
            ) : (
              !isLoading && <p>No recent activities.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            {overview && (
              <>
                <div className="text-4xl font-bold">{avgPerformance}%</div>
                <p className="text-green-500">+8% from last week</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>AI Insights</CardTitle>
          </CardHeader>
          <CardContent>
            {overview ? (
              <p>{overview.insights}</p>
            ) : (
              <p>No AI insights available.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suggested Activities</CardTitle>
          </CardHeader>
          <CardContent className="list-disc pl-5">
            {overview && overview.suggestedActivities.length > 0 ? (
              <ul>
                {overview.suggestedActivities.map((activity, index) => (
                  <li key={index}>{activity}</li>
                ))}
              </ul>
            ) : (
              <p>No suggested activities available.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OverviewPage;
