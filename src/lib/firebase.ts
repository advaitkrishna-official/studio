'use client';

// Import the functions you need from the SDKs you need
import { FirebaseApp, initializeApp } from "firebase/app";
import { getAuth, initializeAuth, indexedDBLocalPersistence, Auth, getReactNativePersistence } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore"; // Import getFirestore
import {useEffect, useState} from 'react';


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
let app: FirebaseApp | undefined;

try {
  app = initializeApp(firebaseConfig);
} catch (error: any) {
  console.error("Firebase initialization error:", error.code);
}



let auth: Auth;
if (app) {
  auth = initializeAuth(app, {
    persistence: indexedDBLocalPersistence,
  });
}
const db: Firestore = getFirestore(app);

export { app , auth, db };
