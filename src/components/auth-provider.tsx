'use client';

import React, { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import { auth as firebaseAuth, db, getUserData } from '@/lib/firebase'; // Ensure auth and db are imported correctly
import { Auth } from "firebase/auth";
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null | undefined; // undefined signifies initial loading state
  loading: boolean;
  userType: 'student' | 'teacher' | null;
  userClass: string | null;
  signOut: () => Promise<void>; // Simplified signOut signature
}

const AuthContext = createContext<AuthContextType>({
  user: undefined, // Start with undefined to indicate loading
  loading: true,
  userType: null,
  userClass: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

// Renaming the component to avoid conflict if AuthProvider is also used elsewhere or expected as default
export default function AuthProviderComponent({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null | undefined>(undefined); // Start as undefined
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'student' | 'teacher' | null>(null);
  const [userClass, setUserClass] = useState<string | null>(null);
  const router = useRouter();


  const fetchUserData = useCallback(async (currentUser: User) => {
    // Ensure db is initialized before using it
    if (!db) {
      console.error("Firestore DB is not initialized");
      setUserType(null); // Set defaults if DB fails
      setUserClass(null);
      return;
    }
     try {
       const userDocRef = doc(db, 'Users', currentUser.uid);
       const userDoc = await getDoc(userDocRef);
       if (userDoc.exists()) {
         const userData = userDoc.data();
         const role = userData.role as 'student' | 'teacher' | null;
         let determinedClass: string | null = null;

         // Correctly fetch class/grade based on role
         if (role === 'teacher') {
            determinedClass = userData.teacherGrade || null;
         } else if (role === 'student') {
            determinedClass = userData.class || null; // 'class' field for students
         }

         console.log(`Fetched user data: Role=${role}, Class/Grade=${determinedClass}`); // Debug log
         setUserType(role);
         setUserClass(determinedClass); // Set the determined class/grade
       } else {
         // Fallback logic if user document doesn't exist (should ideally not happen after registration)
         console.warn(`User document not found for UID: ${currentUser.uid}`);
         setUserType(null);
         setUserClass(null);
       }
     } catch (error) {
       console.error('Error fetching user data:', error);
       setUserType(null); // Reset on error
       setUserClass(null);
     }
  }, []);


  useEffect(() => {
    // Ensure firebaseAuth is initialized
    if (!firebaseAuth) {
        console.error("Firebase Auth is not initialized.");
        setLoading(false); // Stop loading if auth is not available
        setUser(null); // Set user to null explicitly
        setUserType(null);
        setUserClass(null);
        return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async firebaseUser => {
      setLoading(true); // Set loading true when auth state changes
      if (!firebaseUser) {
        console.log("Auth state changed: No user logged in.");
        setUser(null);
        setUserType(null);
        setUserClass(null);
        // No automatic redirect here, handle in page components or Home page
      } else {
        console.log(`Auth state changed: User ${firebaseUser.uid} logged in.`);
        setUser(firebaseUser);
        await fetchUserData(firebaseUser); // Fetch associated data
      }
      setLoading(false); // Set loading false after processing
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [fetchUserData]); // Dependencies


  const signOutFunc = async () => {
    if (!firebaseAuth) {
        console.error("Firebase Auth is not initialized for sign out.");
        return;
    }
    try {
      await firebaseSignOut(firebaseAuth);
      setUser(null); // Clear user state immediately
      setUserType(null);
      setUserClass(null);
      router.push('/login'); // Redirect after sign out
    } catch (error) {
      console.error('Error signing out:', error);
      // Optionally show a toast message on error
    }
  };

  // Memoize the context value to prevent unnecessary re-renders
  const value = React.useMemo(() => ({
    user,
    loading,
    userType,
    userClass,
    signOut: signOutFunc,
  }), [user, loading, userType, userClass]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
