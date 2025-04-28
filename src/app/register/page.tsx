"use client";

import { ChangeEvent, useState } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, doc, setDoc } from "firebase/firestore"; // Added for Firestore saving
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const RegisterPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"teacher" | "student" | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [secretCode, setSecretCode] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [teacherGrade, setTeacherGrade] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const roles = [
    { value: "teacher", label: "Teacher" },
    { value: "student", label: "Student" },
  ];

  const handleRegister = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!email || !password || !role) {
        throw new Error("All fields are required.");
      }

      if (!auth) throw new Error("Authentication is not initialized");

        if(role === "teacher" && secretCode !== "1111") {
           throw new Error("Incorrect secret code for teacher.");
        }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      const user = userCredential.user;

      if (user) {
        const userDocRef = doc(collection(db, "Users"), user.uid);
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          grade: grade,
          teacherGrade: teacherGrade,
          role: role,
        });

        toast({
          title: "Registration Successful",
          description: "You have successfully registered. Please log in.",
        });
        router.push("/login");
      }
    } catch (e: any) {
      const message = e.message || "An error occurred during registration.";
      setError(message);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Register</CardTitle>
          <CardDescription>Enter your details to create an account.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="Enter your email..."
              type="email"
              value={email}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              placeholder="Enter your password..."
              type="password"
              value={password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="role">Role</Label>
            <Select onValueChange={(value: string) => setRole(value as "teacher" | "student")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((roleOption) => (
                  <SelectItem key={roleOption.value} value={roleOption.value}>
                    {roleOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {role === "student" && (
            <div className="grid gap-2">
              <Label htmlFor="grade">Grade</Label>
              <Select onValueChange={setGrade}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your grade" />
                </SelectTrigger>
                <SelectContent>
                  {["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"].map((gradeOption) => (
                    <SelectItem key={gradeOption} value={gradeOption}>
                      {gradeOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

         {role === "teacher" && (
            <div className="grid gap-2">
              <Label htmlFor="grade">Grade</Label>
              <Select onValueChange={setTeacherGrade}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your grade" />
                </SelectTrigger>
                <SelectContent>
                  {["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"].map((gradeOption) => (
                    <SelectItem key={gradeOption} value={gradeOption}>
                      {gradeOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {role === "teacher" && (
            <div className="grid gap-2">
              <Label htmlFor="secretCode">Secret Code</Label>
              <Input
                id="secretCode"
                placeholder="Enter secret code..."
                type="password"
                value={secretCode}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSecretCode(e.target.value)}
              />
            </div>
          )}

          <Button onClick={handleRegister} disabled={isLoading}>
            {isLoading ? "Registering..." : "Register"}
          </Button>

          {error && <p className="text-red-500">{error}</p>}

          <p className="text-sm text-muted-foreground mt-2">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline">Login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;
