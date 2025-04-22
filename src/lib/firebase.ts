'use client';

import { FirebaseApp, initializeApp, getApps } from "firebase/app";
import { getAuth, initializeAuth, indexedDBLocalPersistence, Auth } from "firebase/auth";
import { getFirestore, Firestore, collection, doc, setDoc, getDoc, DocumentData } from "firebase/firestore";
import {useEffect, useState} from 'react';


interface Student {
  id: string;
  email: string;
  studentNumber: string;
  class: string;
  progress: number;
  role: 'student';
}
interface Teacher { id: string, email: string, role: 'teacher' }

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


async function createStudentDocument(student: Student) {
  try {
    const studentDocRef = doc(db, 'students', student.id);
    await setDoc(studentDocRef, student);
    console.log(`Student document created for student ${student.id}`);
  } catch (error: any) {
    console.error("Error creating student document:", error.message);
  }
}

async function createTeacherDocument(teacher: Teacher) {
  try {
      const teacherDocRef = doc(db, 'teachers', teacher.id);
      await setDoc(teacherDocRef, teacher);
      console.log(`Teacher document created for teacher ${teacher.id}`);
  } catch (error: any) {
      console.error("Error creating teacher document:", error.message);
  }
}

async function getStudentData(userId: string) {
  try {
    const studentDocRef = doc(db, 'students', userId);
    const docSnap = await getDoc(studentDocRef);
    if (docSnap.exists()) {
        return docSnap.data() as Student;
    } else {
        console.log("No such student document!");
        return null;
    }
  } catch (error: any) {
    console.error("Error creating user document:", error.message);
  }
}

// Helper function to get document data with type checking
async function getDocumentData<T>(docRef: any): Promise<T | null> {
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as T;
    } else {
      console.log("No such document!");
      return null;
    }
  } catch (error: any) {
    console.error("Error fetching document:", error.message);
    return null;
  }
}

// Function to get user data from Firestore
async function getUserData(userId: string) {
  const studentData = await getStudentData(userId)
  if (studentData) return studentData
  try {
    const teacherDocRef = doc(db, 'teachers', userId);
    const teacherData = await getDocumentData<Teacher>(teacherDocRef);
    return teacherData;
  } catch (error: any) {
    return null;
  }
}

export { app, auth, db, createStudentDocument, createTeacherDocument, getUserData };


