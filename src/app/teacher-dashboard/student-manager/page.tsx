'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";

const StudentManagerPage = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchStudents = async () => {
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

        setStudents(studentsData);
      } catch (e: any) {
        setError(e.message || "An error occurred while fetching students.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [user]);

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-4">Student Manager</h1>
      <p>Manage your students' profiles and track their progress.</p>

      {isLoading && <p>Loading students...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map((student) => (
          <Card key={student.id}>
            <CardHeader>
              <CardTitle>{student.email}</CardTitle>
              <CardDescription>Student Number: {student.studentNumber}</CardDescription>
            </CardHeader>
            <CardContent>
              <p>
                {/* Add student specific information here */}
                Progress: {/* Placeholder for progress tracking */}
              </p>
              <Button variant="secondary">
                Send Message <Icons.messageSquare className="ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StudentManagerPage;
