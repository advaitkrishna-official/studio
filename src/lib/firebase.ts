'use client';

import { FirebaseApp, initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth, initializeAuth, indexedDBLocalPersistence, Auth } from "firebase/auth";
import { getFirestore, Firestore, collection, doc, setDoc, getDoc, DocumentData, addDoc, query, where, getDocs } from "firebase/firestore";
import {useEffect, useState} from 'react';


interface Student {
  id: string;
  email: string;
  studentNumber: string;
  class: string;
  progress?: number;
  role: 'student';
}
interface Teacher { id: string, email: string, role: 'teacher', class: string }

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


async function createUserDocument(userId: string, email: string, studentNumber: string, role: "teacher" | "student", selectedClass: string ) {
    try {
        const userDocRef = doc(db, 'users', userId); 
        let userData: Student | Teacher;

        if (role === "teacher") {
            userData = {
                id: userId,
                email: email,
                role: "teacher",
            } as Teacher;
        } else {
            userData = {
                id: userId,
                email: email,
                studentNumber: studentNumber,
                class: selectedClass,
                progress: 0,
                role: "student",
            } as Student;
        }
        await setDoc(userDocRef, userData);
        console.log(`User document created for user ${userId} with role ${role}`);
    } catch (error: any) {
        console.error("Error creating user document:", error.message);
    }
}

async function getStudentData(userId: string) {
  try {
    const studentDocRef = doc(db, 'users', userId); 
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

async function getUserDataByUid(userId: string): Promise<Student | Teacher | null> {
  try {
    const userDocRef = doc(db, 'users', userId); 
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.role === 'student') {
        return userData as Student;
      } else if (userData.role === 'teacher') {
        return userData as Teacher;
      }
    }
    return null;
  } catch (error: any) {
    console.error('Error fetching user data:', error.message);
    return null;
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
    const teacherDocRef = doc(db, 'users', userId); 
    const teacherData = await getDocumentData<Teacher>(teacherDocRef);
    return teacherData;
  } catch (error: any) {
    return null;
  }
}

// Function to save a grade for a student
async function saveGrade(studentId: string, taskName: string, score: number, feedback: string) {
  try {
        const studentData = await getStudentData(studentId);
        const studentClass = studentData?.class;

    const gradesCollection = collection(db, 'users', studentId, 'grades'); 
    await addDoc(gradesCollection, {
      taskName: taskName,
      score: score,
      feedback: feedback,
      timestamp: new Date(),
      ...(studentClass && {
        class: studentClass,
      })
    });
    console.log(`Grade saved for student ${studentId} on task ${taskName}`);
  } catch (error: any) {
    console.error("Error saving grade:", error.message);
  }
}



export { app, auth, db, getUserData, createUserDocument, saveGrade,  getUserDataByUid };
