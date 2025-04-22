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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userType: null,
  userClass: null,
  signOut: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
  setUser: (user: User | null) => void;
  setUserType: (userType: 'student' | 'teacher' | null) => void;
  setUserClass: (userClass: string | null) => void;
}

export default function AuthProvider({children, setUser, setUserType, setUserClass}: AuthProviderProps) {
  const [user, setLocalUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setLocalUserType] = useState<'student' | 'teacher' | null>(null);
  const [userClass, setLocalUserClass] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let unsubscribe: () => void;

    if (!auth) {
      unsubscribe = () => {};
      setLoading(false);
    } else {
      unsubscribe = onAuthStateChanged(getAuth(app), async user => {
        if (!user) {
          setLocalUser(null);
          setLocalUserType(null);
          setLocalUserClass(null);
          setUser(null);
          setUserType(null);
          setUserClass(null);
          setLoading(false);
          router.push('/login');
        } else {
          setLocalUser(user);
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
          setLocalUserType(type);
          setUserType(type);
          setLocalUserClass(classVal);
          setUserClass(classVal);
          setLoading(false);
        }
      });
    }
    return () => unsubscribe();
  }, [router, setUser, setUserType, setUserClass]);

  const signOutFunc = async () => {
    if (auth) {
      try {
        await signOut(auth);
        setLocalUser(null);
        setLocalUserType(null);
        setLocalUserClass(null);
        setUser(null);
        setUserType(null);
        setUserClass(null);
        router.push('/login');
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }
  };

  const value: AuthContextType = {
    user: user,
    loading,
    userType: userType,
    userClass: userClass,
    signOut: signOutFunc,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
