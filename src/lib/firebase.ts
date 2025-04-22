'use client';

import { FirebaseApp, initializeApp, getApps } from "firebase/app";
import { getAuth, initializeAuth, indexedDBLocalPersistence, Auth } from "firebase/auth";
import { getFirestore, Firestore, collection, doc, setDoc, getDoc } from "firebase/firestore";
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

// Function to create a new user document in Firestore
async function createUserDocument(userId: string, email: string, studentNumber: string, role: string, classVal: string) {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      email: email,
      studentNumber: studentNumber,
      role: role,
      class: classVal,
      progress: 0, // Initialize progress
      lastMessage: '', // Initialize last message
    });
    console.log(`User document created for user ${userId}`);
  } catch (error: any) {
    console.error("Error creating user document:", error.message);
  }
}

// Function to get user data from Firestore
async function getUserData(userId: string) {
    try {
        const userDocRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            console.log("No such document!");
            return null;
        }
    } catch (error: any) {
        console.error("Error getting user document:", error.message);
        return null;
    }
}

export { app, auth, db, createUserDocument, getUserData };

