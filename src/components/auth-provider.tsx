'use client';

import {useState, useEffect, createContext, useContext, ReactNode} from 'react';
import {useRouter} from 'next/navigation';
import {
  getAuth,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import {auth, db, app} from '@/lib/firebase';
import {doc, getDoc} from 'firebase/firestore';

interface AuthContextType {
  user: User | null | undefined;
  loading: boolean;
  userType: 'student' | 'teacher' | null;
  userClass: string | null;
  signOut: () => void;
  setUser: (user: User | null) => void;
  setUserType: (type: 'student' | 'teacher' | null) => void;
  setUserClass: (userClass: string | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userType: null,
  userClass: null,
  signOut: () => {},
  setUser: (user: User | null) => {},
  setUserType: (type: 'student' | 'teacher' | null) => {},
  setUserClass: (userClass: string | null) => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({children}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<'student' | 'teacher' | null>(null);
  const [userClass, setUserClass] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth ? onAuthStateChanged(auth, async user => {
      if (!user) {
        setUser(null);
        setUserType(null);
        setUserClass(null);
        setLoading(false);
        router.push('/login');
      } else {
        setUser(user);

        let type: 'student' | 'teacher' = 'student';
        let classVal: string | null = null;

        try {
          if (db) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              if (userData?.role === 'teacher') {
                type = 'teacher';
              }
              classVal = userData?.class || null;
            } else if (user.email?.endsWith('@teacher.com')) {
              type = 'teacher';
            }
          }
        } catch (error) {
          console.error('Error fetching user role from Firestore:', error);
          type = user.email?.endsWith('@teacher.com') ? 'teacher' : 'student';
        }
        setUserType(type);
        setUserClass(classVal)
        setLoading(false);
      }
    }) : () => {};
    return () => unsubscribe();
  }, [router]);

  const signOutFunc = async () => {
    if (auth) {
      try {
        await signOut(auth);
        router.push('/login');
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    userType,
    userClass,
    signOut: signOutFunc,
    setUser,
    setUserType,
    setUserClass,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
