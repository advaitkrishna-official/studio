'use client';

import { useState } from "react";
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db, getUserDataByUid } from "@/lib/firebase";
import Link from 'next/link';


const Login = () => {
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
      if (!auth) {
        setError("Authentication is not properly initialized.");
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Authentication is not properly initialized.",
        });
        return;
      }
      if (!db) {
        setError("Database is not properly initialized.");
        toast({
          variant: "destructive",
          title: "Database Error",
          description: "Database is not properly initialized.",
        });
        return;
      }
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
        
      if (user) {
        const userData = await getUserDataByUid(user.uid);
        
        if (userData) {
           
          // Redirect based on user role
          if (userData.role) {
              if (userData.role === "teacher") {
                router.replace(`/teacher-dashboard`);
              } else if (userData.role === "student") {
                router.replace(`/student-dashboard`);
              }
            }
        }  else {
          // User data not found
          toast({
            variant: "destructive",
            title: "Login Failed",
            description: "Failed to retrieve user data. Please try again.",
          });
        }
      } else {
        // User not found       
        toast({
          variant: "destructive",
          description: "User not found",
          title: "Login failed",
        });
      }
    } catch (e: any) {
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
          <p className="text-sm text-muted-foreground">
            Don't have an account? <Link href="/register" className="text-primary underline">Register</Link>
          </p>        
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;

