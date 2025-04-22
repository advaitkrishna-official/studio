"use client";

import { useState } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import Link from 'next/link';
import { getDoc, doc } from "firebase/firestore";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Determine user type (teacher/student)
      let userType: 'student' | 'teacher' = 'student'; // Default to student
      let userClass: string | null = null;

      // Check Firestore for a teacher role
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData?.role === 'teacher') {
          userType = 'teacher';
        }
        userClass = userData?.class || null;
      } else if (user.email?.endsWith('@teacher.com')) {
         userType = 'teacher';
      }

      toast({
        title: "Login Successful",
        description: "You have successfully logged in.",
      });

      // Redirect based on user type and class
      if (userType === 'teacher') {
        router.push(`/teacher-dashboard?class=${userClass}`); // Redirect to teacher dashboard with class
      } else {
        router.push('/'); // Redirect to student dashboard
      }
    } catch (e: any) {
      setError(e.message || "An error occurred during login.");
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: e.message || "Invalid credentials. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            Enter your email and password to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="Enter your email..."
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              placeholder="Enter your password..."
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Logging In..." : "Login"}
          </Button>
          {error && <p className="text-red-500">{error}</p>}
          <p className="text-sm text-muted-foreground">
            Don't have an account? <Link href="/register" className="text-primary">Register</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
