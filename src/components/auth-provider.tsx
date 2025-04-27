'use client';

import {useState, useEffect, createContext, useContext, ReactNode, useCallback} from 'react';
import {useRouter} from 'next/navigation';
import {
  getAuth,
  onAuthStateChanged, signOut as firebaseSignOut, User} from 'firebase/auth';
import {auth as firebaseAuth, db, getUserData} from '@/lib/firebase';
import {Auth} from "firebase/auth";
import {doc, getDoc} from 'firebase/firestore';

interface AuthContextType {
  user: User | null | undefined;
  loading: boolean;
  userType: 'student' | 'teacher' | null;
  userClass: string | null;
  signOut: (auth:any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  userType: null,
  userClass: null,
  signOut: async (auth: any) => {},
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


  const fetchUserData = useCallback(async (user: User) => {
    try {
      const userData = await getUserData(user.uid);
      if (userData) {
        setUserType(userData.role);
        setUserClass(userData.class);
      } else {
        setUserType(user.email?.endsWith('@teacher.com') ? 'teacher' : 'student');
        setUserClass(null);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      setUserType(user.email?.endsWith('@teacher.com') ? 'teacher' : 'student');
      setUserClass(null);
    }
  }, []);


  useEffect(() => {
    const unsubscribe = firebaseAuth ? onAuthStateChanged(firebaseAuth, async user => {
      if (!user) {
        setUser(null);
        setUserType(null);
        setUserClass(null);
        setLoading(false);
        router.push('/login');
      } else {
        setUser(user);
        await fetchUserData(user);
        setLoading(false);
      }
    }) : () => {};
    return () => unsubscribe();
  }, [router, fetchUserData]);

  const signOutFunc = async (auth: any) => {
      const authAux = getAuth();
    if (authAux) {
       try {
        await firebaseSignOut(authAux);
        await router.push('/login');
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
