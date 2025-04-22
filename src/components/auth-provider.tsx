'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null | undefined;
  loading: boolean;
  userType: 'student' | 'teacher' | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userType: null,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'student' | 'teacher' | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // Determine user type (teacher/student)
        if (user.email?.endsWith('@teacher.com')) {
          setUserType('teacher');
        } else {
          // Check Firestore for a teacher role as a fallback
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists() && userDoc.data()?.role === 'teacher') {
              setUserType('teacher');
            } else {
              setUserType('student');
            }
          } catch (error) {
            console.error("Error fetching user role from Firestore:", error);
            // If Firestore is unavailable, default to student.
            setUserType('student');
          }
        }
      } else {
        setUser(null);
        setUserType(null);
        router.push('/login'); // Redirect to login if not authenticated
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const value: AuthContextType = {
    user,
    loading,
    userType,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
