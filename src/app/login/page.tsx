
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, getUserDataByUid } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
// Lottie import removed as the file doesn't exist and generating assets is not allowed.
// import Lottie from 'lottie-react';
// import eduAnimation from '@/assets/animations/edu-login.json';

const placeholders = [
  'student@edu.ai',
  'teacher@edu.ai',
  'you@yourmail.com',
];

export default function AnimatedLogin() {
  const [email, setEmail] = useState('');
  const [placeholder, setPlaceholder] = useState(placeholders[0]);
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Cycle placeholder text every 3s
  useEffect(() => {
    let idx = 0;
    const iv = setInterval(() => {
      idx = (idx + 1) % placeholders.length;
      setPlaceholder(placeholders[idx]);
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const data = await getUserDataByUid(cred.user.uid);
      if (data?.role === 'teacher') {
        router.replace('/teacher-dashboard');
      } else {
        router.replace('/student-dashboard');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Login Error', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 overflow-hidden">
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
        initial={{ opacity: 0, scale: 0.8, y: 50 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 flex flex-col items-center bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 max-w-md w-full"
      >
        {/* Lottie Illustration Removed */}
        {/* <div className="w-32 h-32 mb-4">
          <Lottie animationData={eduAnimation} loop autoplay />
        </div> */}

        <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back!</h1>
        <p className="text-gray-600 mb-6 text-center">
          Sign in to continue your Education AI adventure.
        </p>

        <div className="w-full space-y-4">
          {/* Email Input */}
          <motion.div whileFocus={{ scale: 1.02 }} className="relative">
            <input
              type="email"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              placeholder={placeholder}
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <span className="absolute inset-y-0 right-4 flex items-center text-gray-400">✉️</span>
          </motion.div>

          {/* Password Input */}
          <motion.div whileFocus={{ scale: 1.02 }} className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              onClick={() => setShowPw(!showPw)}
              className="absolute inset-y-0 right-4 flex items-center text-gray-400"
              aria-label="Toggle password visibility"
            >
              {showPw ? '🙈' : '👁️'}
            </button>
          </motion.div>
        </div>

        <motion.button
          onClick={handleSubmit}
          disabled={loading}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="mt-6 w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Signing In…' : 'Sign In'}
        </motion.button>

        <p className="mt-4 text-center text-sm text-gray-600">
          New here?{' '}
          <Link href="/register" className="text-indigo-600 font-medium hover:underline">
            Create an account
          </Link>
        </p>
         <p className="mt-2 text-center text-xs text-gray-500">
          Or <Link href="/" className="text-indigo-600 hover:underline">go back to Home</Link>
        </p>
      </motion.div>
    </div>
  );
}
