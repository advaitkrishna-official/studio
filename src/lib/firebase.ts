'use client';

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, indexedDBLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Import getFirestore

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
let app;

try {
  app = initializeApp(firebaseConfig);
} catch (error: any) {
  console.error("Firebase initialization error:", error.message);
}

// Initialize Firebase Authentication and persist the user's session
let auth;

if (typeof window !== 'undefined' && app) {
  try {
    auth = initializeAuth(app, {
      persistence: indexedDBLocalPersistence,
    });
  } catch (error: any) {
    console.error("Firebase Auth initialization error:", error);
  }
}

const db = getFirestore(app); // Initialize Firestore

export { app, auth, db };
