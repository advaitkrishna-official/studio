'use client';

import {useState, useEffect} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {generateOverview, GenerateOverviewOutput} from "@/ai/flows/generate-overview";
import {useAuth} from "@/components/auth-provider";
import {db} from "@/lib/firebase";
import {collection, query, where, onSnapshot, Unsubscribe} from "firebase/firestore";
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
  const [studentData, setStudentData] = useState<
    {
      id: string;
      name: string;
      class: string;
      progress: number;
      lastActivity: string;
    }[]
  >([]);

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (!user) {
          setError("User not logged in.");
          return null;
        }

        const studentsCollection = collection(db, "users");
        const q = query(studentsCollection, where("class", "==", selectedClass));
        unsubscribe = onSnapshot(q, (snapshot) => {
          const studentsData: {
              id: string;
              name: string;
              class: string;
              progress: number;
              lastActivity: string;
            }[] = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as any),
          })) as any;
          setStudentData(studentsData);
          
          const studentDataString = JSON.stringify(studentsData);
          generateOverview({
            teacherId: user.uid,
            studentData: studentDataString,
          }).then(result => setOverview(result));
        });
        return unsubscribe;
      } catch (e: any) {
        setError(e.message || "An error occurred while generating the overview.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
    return () => {
        if (unsubscribe) {
            unsubscribe();
        }
        
    }
  }, [user, selectedClass]);

  const avgPerformance = studentData.length > 0 ? studentData.reduce((acc, student) => acc + (student.progress), 0) / studentData.length : 0;
  const totalStudents = studentData?.length || 0;

  // Calculate active engagement (example: students with > 50% progress)
  const activeEngagement = studentData.length > 0 ? (studentData.filter(student => (student.progress || 0) > 50).length / studentData.length) * 100 : 0;

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Overview</h1>
        <Select onValueChange={setSelectedClass} defaultValue={userClass ? userClass : undefined}>
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
            <div className="text-2xl font-bold">{avgPerformance.toFixed(2)}%</div>
            <div className="text-muted-foreground">Avg Performance</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center space-y-2 p-6">
            <div className="text-2xl font-bold">{activeEngagement.toFixed(0)}%</div>
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
            {error && <p className="text-red-500">{error}</p>}
            {isLoading ? (
              <p>Loading recent activities...</p>
            ) : studentData.length > 0 ? (
              <ul>
                <li>{`${studentData[0].name} completed assignment A.`}</li>
                <li>{`${studentData[1].name} scored 85% in quiz B.`}</li>
                <li>{`${studentData[2].name} started lesson C.`}</li>
                <li>{`${studentData[3].name} added to the class ${studentData[3].class}`}</li>               
              </ul>
            ) : overview && overview.recentActivities.length > 0 ? (
              <ul>
                {overview.recentActivities.map((activity, index) => (
                  <li key={index}>{activity}</li>
                ))}
              </ul>
            ) : (
              <p>No recent activities.</p>
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
                <div className="text-4xl font-bold">{avgPerformance.toFixed(2)}%</div>
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
              <p>No AI insights available. Please provide student data to generate insights.</p>
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
              <p>No suggested activities available. Check student enrollment and data import process.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OverviewPage;
