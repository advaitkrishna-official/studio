// src/components/auth-provider.tsx
'use client'; // Ensure this remains a client component

import React, {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
  useCallback,
} from 'react';
import {useRouter} from 'next/navigation';
import {onAuthStateChanged, signOut as firebaseSignOut, User} from 'firebase/auth';
import {auth as firebaseAuth, db} from '@/lib/firebase'; // Ensure auth and db are imported correctly
import {doc, getDoc} from 'firebase/firestore';

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
export default function AuthProviderComponent({children}: AuthProviderProps) {
  const [user, setUser] = useState<User | null | undefined>(undefined); // Start as undefined
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'student' | 'teacher' | null>(null);
  const [userClass, setUserClass] = useState<string | null>(null);
  const router = useRouter();

  const fetchUserData = useCallback(async (currentUser: User | null) => {
    // Ensure db is initialized before using it
    if (!db) {
      console.error('AuthProvider: Firestore DB is not initialized');
      setUserType(null); // Set defaults if DB fails
      setUserClass(null);
      setLoading(false); // Ensure loading stops if DB fails early
      return;
    }

    if (!currentUser) {
      console.log('AuthProvider: No current user, skipping fetchUserData.');
      setUserType(null);
      setUserClass(null);
      setLoading(false); // Ensure loading stops if no user
      return;
    }

    console.log(`AuthProvider: Fetching data for user ${currentUser.uid}...`);
    try {
      const userDocRef = doc(db, 'Users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('AuthProvider: Fetched userData:', userData); // Log fetched data
        const role = userData.role as 'student' | 'teacher' | null;
        let determinedClass: string | null = null;

        // Correctly fetch class/grade based on role
        if (role === 'teacher') {
           determinedClass = userData.teacherGrade || null;
           console.log(`AuthProvider: User is a teacher, setting teacherGrade: ${determinedClass}`);
        } else if (role === 'student') {
           // Check both 'class' and 'grade' fields for flexibility
           determinedClass = userData.class || userData.grade || null;
           console.log(`AuthProvider: User is a student, setting class/grade: ${determinedClass}`);
        } else {
           console.warn(`AuthProvider: User role is unknown or missing: ${role}`);
        }

        setUserType(role);
        setUserClass(determinedClass); // Set the determined class/grade
        console.log(`AuthProvider: State updated - userType: ${role}, userClass: ${determinedClass}`);
      } else {
        // Fallback logic if user document doesn't exist
        console.warn(`AuthProvider: User document not found for UID: ${currentUser.uid}`);
        setUserType(null);
        setUserClass(null);
      }
    } catch (error) {
      console.error('AuthProvider: Error fetching user data:', error);
      setUserType(null); // Reset on error
      setUserClass(null);
    } finally {
        setLoading(false); // Stop loading after fetch attempt (success or error)
        console.log("AuthProvider: fetchUserData complete, loading set to false.");
    }
  }, []); // Removed db from dependencies as it should be stable


  useEffect(() => {
    // Ensure firebaseAuth is initialized
    if (!firebaseAuth) {
        console.error("AuthProvider: Firebase Auth is not initialized.");
        setLoading(false); // Stop loading if auth is not available
        setUser(null); // Set user to null explicitly
        setUserType(null);
        setUserClass(null);
        return;
    }

    console.log("AuthProvider: Setting up onAuthStateChanged listener.");
    const unsubscribe = onAuthStateChanged(firebaseAuth, async firebaseUser => {
      console.log(`AuthProvider: onAuthStateChanged triggered. User: ${firebaseUser ? firebaseUser.uid : 'null'}`);
      // Set loading to true whenever the auth state might change
      // setLoading(true); // Moved setting loading false to fetchUserData or no user case

      if (!firebaseUser) {
        console.log("AuthProvider: No user logged in.");
        setUser(null);
        setUserType(null);
        setUserClass(null);
        // --- Stop loading when no user ---
        setLoading(false);
        console.log("AuthProvider: No user, loading set to false.");
      } else {
        console.log(`AuthProvider: User ${firebaseUser.uid} logged in. Setting user state.`);
        setUser(firebaseUser); // Set user first
        await fetchUserData(firebaseUser); // Fetch data, fetchUserData will set loading false
      }
    });

    // Cleanup subscription on unmount
    return () => {
      console.log("AuthProvider: Cleaning up onAuthStateChanged listener.");
      unsubscribe();
    };
  }, [fetchUserData]); // fetchUserData is memoized


  const signOutFunc = async () => {
    if (!firebaseAuth) {
        console.error("AuthProvider: Firebase Auth is not initialized for sign out.");
        return;
    }
    try {
      setLoading(true); // Indicate loading during sign out
      console.log("AuthProvider: Signing out...");
      await firebaseSignOut(firebaseAuth);
      setUser(null); // Clear user state immediately
      setUserType(null);
      setUserClass(null);
      console.log("AuthProvider: Sign out successful, redirecting to /login.");
      router.push('/login'); // Redirect after sign out
    } catch (error) {
      console.error('AuthProvider: Error signing out:', error);
      // Optionally show a toast message on error
    } finally {
        setLoading(false); // Stop loading after sign out attempt
    }
  };

  // Memoize the context value to prevent unnecessary re-renders
  const value = React.useMemo(() => ({
    user,
    loading,
    userType,
    userClass,
    signOut: signOutFunc,
  }), [user, loading, userType, userClass]); // Removed router and signOutFunc as deps because signOutFunc doesn't change

  console.log("AuthProvider: Rendering with context value:", {loading, user: user?.uid, userType, userClass}); // Log context value on render

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
