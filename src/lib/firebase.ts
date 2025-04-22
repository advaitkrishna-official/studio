'use client';

import { FirebaseApp, initializeApp, getApps } from "firebase/app";
import { getAuth, initializeAuth, indexedDBLocalPersistence, Auth } from "firebase/auth";
import { getFirestore, Firestore, collection, doc, setDoc } from "firebase/firestore"; // Import getFirestore and other functions
import {useEffect, useState} from 'react';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app: FirebaseApp;
let auth: Auth | undefined;
let db: Firestore;

if (getApps().length === 0) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);

    if (typeof window !== 'undefined') {
      auth = initializeAuth(app, {
        persistence: indexedDBLocalPersistence,
      });
    }
  } catch (error: any) {
    console.error("Firebase initialization error:", error.message);
  }
} else {
  app = getApps()[0];
  db = getFirestore(app);
  if (typeof window !== 'undefined') {
    auth = getAuth(app);
  }
}

// Mock data for seeding
const mockStudents = [
  { email: 'student1@example.com', studentNumber: '1001', class: 'Grade 8', progress: 75 },
  { email: 'student2@example.com', studentNumber: '1002', class: 'Grade 6', progress: 50 },
  { email: 'student3@example.com', studentNumber: '1003', class: 'Grade 4', progress: 90 },
];

// Function to seed the database
async function seedDatabase() {
  if (!db) {
    console.error("Firestore not initialized");
    return;
  }

  try {
    const studentsCollection = collection(db, 'users');
    for (const student of mockStudents) {
      const studentDocRef = doc(studentsCollection); // Create a new document with a unique ID
      await setDoc(studentDocRef, {
        ...student,
        role: 'student', // Add role field
      });
      console.log(`Added student with email: ${student.email}`);
    }
    console.log("Database seeded successfully!");
  } catch (error: any) {
    console.error("Error seeding database:", error.message);
  }
}

// Call the seedDatabase function (you might want to trigger this from a button in your UI for testing)
seedDatabase();

export { app, auth, db, seedDatabase };

