'use client';

// Import the functions you need from the SDKs you need
import { FirebaseApp, initializeApp } from "firebase/app";
import { getAuth, initializeAuth, indexedDBLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Import getFirestore

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcqjDbNHsBYK8HfXMH_0_qMW6s_sOkxJo",
  authDomain: "eduai-5epn8.firebaseapp.com",
  projectId: "eduai-5epn8",
  storageBucket: "eduai-5epn8.firebasestorage.app",
  messagingSenderId: "25200449948",
  appId: "1:25200449948:web:fde24e3b765c7779e19059"
};

// Initialize Firebase
let app: FirebaseApp | undefined = undefined;

try {
  app = initializeApp(firebaseConfig);
} catch (error: any) {
  console.error("Firebase initialization error:", error);
}

// Initialize Firebase Authentication and persist the user's session
let auth: import("firebase/auth").Auth | undefined;

if (typeof window !== 'undefined' && app) {
  try {
    auth = initializeAuth(app, {
      persistence: indexedDBLocalPersistence,
    });
  } catch (error) {
    console.error("Firebase Auth initialization error:", error);
  }
}

// Initialize Firestore only if app is initialized
let db: import("firebase/firestore").Firestore | undefined;
if (app) {
  db = getFirestore(app);
}

export { app , auth, db };
