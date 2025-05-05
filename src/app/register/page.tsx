'use client';

import React, { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { auth, db, getUserDataByUid } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc } from 'firebase/firestore';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

const emailPlaceholders = [
  'student@edu.ai',
  'teacher@edu.ai',
  'you@yourmail.com',
];

export default function AnimatedRegister() {
  const [email, setEmail] = useState('');
  const [emailPlaceholder, setEmailPlaceholder] = useState(emailPlaceholders[0]);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'teacher' | 'student' | ''>('');
  const [grade, setGrade] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Cycle email placeholder
  useEffect(() => {
    let idx = 0;
    const iv = setInterval(() => {
      idx = (idx + 1) % emailPlaceholders.length;
      setEmailPlaceholder(emailPlaceholders[idx]);
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  const handleRegister = async () => {
    setLoading(true);
    try {
      if (!email || !password || !role || (role === 'teacher' && !secretCode) || (role === 'student' && !grade)) {
        throw new Error('Please fill in all required fields.');
      }
      if (role === 'teacher' && secretCode !== '1111') {
        throw new Error('Invalid secret code for teachers.');
      }
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(collection(db, 'Users'), cred.user.uid), {
        uid: cred.user.uid,
        email: cred.user.email,
        role,
        grade: role === 'student' ? grade : null,
        teacherGrade: role === 'teacher' ? grade : null,
      });
      toast({ title: 'Registration successful! Please log in.' });
      router.push('/login');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Registration Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 overflow-hidden px-4">
      {/* Floating Shapes */}
      <motion.div
        className="absolute w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-30"
        animate={{ x: [-100, 100, -100], y: [-80, 80, -80] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/4 right-0 w-56 h-56 bg-pink-300 rounded-full mix-blend-multiply filter blur-2xl opacity-25"
        animate={{ y: [0, 200, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Animated Card */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 max-w-lg w-full"
      >
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Create Your Account</h1>
        <p className="text-center text-gray-600 mb-6">
          Join Education AI as a {role || '...'}!
        </p>

        <div className="space-y-4">
          {/* Email */}
          <motion.div whileFocus={{ scale: 1.02 }} className="relative">
            <input
              type="email"
              placeholder={emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <span className="absolute inset-y-0 right-4 flex items-center text-gray-400">✉️</span>
          </motion.div>

          {/* Password */}
          <motion.div whileFocus={{ scale: 1.02 }} className="relative">
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
            <span className="absolute inset-y-0 right-4 flex items-center text-gray-400">🔒</span>
          </motion.div>

          {/* Role Select */}
          <Select onValueChange={(v) => setRole(v as 'teacher' | 'student')} value={role}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select role…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
            </SelectContent>
          </Select>

          {/* Conditional Grade / Secret Code */}
          {role === 'student' && (
            <Select onValueChange={setGrade} value={grade}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your grade…" />
              </SelectTrigger>
              <SelectContent>
                {['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5'].map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {role === 'teacher' && (
            <>
              <Select onValueChange={setGrade} value={grade}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select your teaching grade…" />
                </SelectTrigger>
                <SelectContent>
                  {['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5'].map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <motion.div whileFocus={{ scale: 1.02 }} className="relative">
                <input
                  type="password"
                  placeholder="Teacher secret code"
                  value={secretCode}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSecretCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
                <span className="absolute inset-y-0 right-4 flex items-center text-gray-400">🔑</span>
              </motion.div>
            </>
          )}
        </div>

        <motion.button
          onClick={handleRegister}
          disabled={loading}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="mt-8 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Registering…' : 'Register'}
        </motion.button>

        <p className="mt-4 text-center text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>

      {/* Animated Background */}
      <style jsx>{`
        @keyframes bgShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .bg-gradient-to-br {
          background-size: 200% 200%;
          animation: bgShift 20s ease infinite;
        }
      `}</style>
    </div>
  );
}
