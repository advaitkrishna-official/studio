'use client';

import { FirebaseApp, initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, indexedDBLocalPersistence, Auth } from 'firebase/auth';
import { getFirestore, Firestore, collection, doc, setDoc, getDoc, DocumentData, addDoc, query, where, getDocs, DocumentReference, Timestamp, updateDoc } from 'firebase/firestore'; // Added Timestamp and updateDoc


// Define User Types
interface BaseUser {
  id: string;
  email: string;
  role: 'student' | 'teacher';
}

interface Student extends BaseUser {
  role: 'student';
  studentNumber?: string;
  class?: string; // Make class optional initially
  progress?: Record<string, number>; // Track progress per subject/topic
}

interface Teacher extends BaseUser {
  role: 'teacher';
  teacherGrade?: string; // Grade the teacher primarily teaches
}

// Define GradeData structure
export interface GradeData {
  id: string;
  taskName: string;
  score: number;
  feedback: string;
  timestamp: Timestamp | Date; // Can be Firestore Timestamp or JS Date
}


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};


let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;


// Initialize Firebase only on the client side
if (typeof window !== 'undefined') {
    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        try {
          auth = initializeAuth(app, {
            persistence: indexedDBLocalPersistence,
          });
        } catch (error: any) {
           console.error("Firebase Auth initialization error:", error.message);
           // Handle the error appropriately, maybe set auth to null or show a user message
           auth = null; // Ensure auth is null if initialization fails
        }
    } else {
        app = getApp();
        db = getFirestore(app);
        auth = getAuth(app); // Use getAuth instead of initializeAuth for existing apps
    }
}


async function generateUniqueStudentId(): Promise<string> {
    if (!db) throw new Error("Firestore DB is not initialized");
  let studentId = "";
  let isUnique = false;
  while (!isUnique) {
    studentId = Math.floor(100000 + Math.random() * 900000).toString();
    const docRef = doc(db, 'Users', studentId); // Use db directly
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      isUnique = true;
    }
  }
  return studentId;
}



async function getGrades(userId: string): Promise<GradeData[]> {
    if (!db) {
        console.error("Firestore is not initialized.");
        return [];
    }
    try {
        const gradesCollection = collection(db, 'Users', userId, 'grades');
        const gradesSnapshot = await getDocs(gradesCollection);
        const grades = gradesSnapshot.docs.map(doc => {
          const data = doc.data();
          // Convert timestamp if it's a Firestore Timestamp
          const timestamp = data.timestamp instanceof Timestamp ? data.timestamp.toDate() : (data.timestamp ?? new Date());
          return {
            id: doc.id,
            taskName: data.taskName ?? 'Untitled Task', // Provide default values
            score: data.score ?? 0,
            feedback: data.feedback ?? '',
            timestamp: timestamp, // Use the converted or default date
            ...data // Spread remaining fields
          } as GradeData;
        });
        return grades;
    } catch (error: any) {
        console.error('Error fetching grades:', error.message);
        return []; // Return an empty array in case of error
    }
}

async function createUserDocument(userId: string, email: string, role: "teacher" | "student", details: { grade?: string; teacherGrade?: string; secretCode?: string }) {
    if (!db) throw new Error("Firestore DB is not initialized");
    try {
        const userDocRef = doc(db, 'Users', userId); // Use db directly
        let userData: Student | Teacher;

        if (role === "teacher") {
            // Basic validation for teacher creation
            if (details.secretCode !== "1111") { // Example secret code check
                throw new Error("Incorrect secret code for teacher registration.");
            }
            userData = {
                id: userId,
                email: email,
                role: "teacher",
                teacherGrade: details.teacherGrade || "Not Specified", // Default if not provided
            };
        } else if (role === "student") {
            const studentNumber = await generateUniqueStudentId(); // Generate student number
            userData = {
                id: userId,
                email: email,
                role: "student",
                studentNumber: studentNumber,
                class: details.grade || "Not Assigned", // Default if not provided
                progress: {}, // Initialize progress
            };
        } else {
            throw new Error("Invalid role provided.");
        }

        await setDoc(userDocRef, userData);
        console.log(`User document created for user ${userId} with role ${role}`);
        return userData; // Return the created user data
    } catch (error: any) {
        console.error("Error creating user document:", error.message);
        throw error; // Re-throw the error to be handled by the caller
    }
}


async function getStudentData(userId: string): Promise<Student | null> {
    if (!db) {
        console.error("Firestore is not initialized.");
        return null;
    }
    try {
        const studentDocRef = doc(db, 'Users', userId);
        const docSnap = await getDoc(studentDocRef);
        if (docSnap.exists() && docSnap.data()?.role === 'student') {
            return { id: docSnap.id, ...docSnap.data() } as Student;
        } else {
            console.log("No such student document or role mismatch!");
            return null;
        }
    } catch (error: any) {
        console.error("Error fetching student document:", error.message);
        return null; // Return null on error
    }
}
async function getUserDataByUid(userId: string): Promise<Student | Teacher | null> {
     if (!db) {
        console.error("Firestore is not initialized.");
        return null;
    }
    try {
        const userDocRef = doc(db, 'Users', userId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
             return { id: userDoc.id, ...userData } as Student | Teacher; // Assume type based on role or structure
        }
        console.log("User document not found for UID:", userId);
        return null;
    } catch (error: any) {
        console.error('Error fetching user data:', error.message);
        return null;
    }
}
// Helper function to get document data with type checking
async function getDocumentData<T>(docRef: DocumentReference): Promise<T | null> {
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as T;
        } else {
            console.log("No such document!");
            return null;
        }
    } catch (error: any) {
        console.error("Error fetching document:", error.message);
        return null;
    }
}

// Function to get user data from Firestore (tries student first, then teacher)
async function getUserData(userId: string): Promise<Student | Teacher | null> {
     if (!db) {
        console.error("Firestore is not initialized.");
        return null;
    }
     const userDocRef = doc(db, 'Users', userId);
     return getDocumentData<Student | Teacher>(userDocRef);
}

// Function to save a grade for a student
async function saveGrade(studentId: string, taskName: string, score: number, feedback: string) {
     if (!db) {
        console.error("Firestore is not initialized.");
        return;
    }
    try {
        // Fetch student data to potentially add class info (optional, depends on needs)
        // const studentData = await getStudentData(studentId);

        const gradeData: Omit<GradeData, 'id'> = { // Use Omit to exclude id
            taskName: taskName,
            score: score,
            feedback: feedback,
            timestamp: Timestamp.now(), // Use Firestore Timestamp for consistency
        };

        const gradesCollection = collection(db, 'Users', studentId, 'grades');
        await addDoc(gradesCollection, gradeData);

        console.log(`Grade saved for student ${studentId} on task ${taskName}`);

        // Update student's overall progress (example logic)
        const studentDocRef = doc(db, 'Users', studentId);
        const studentDoc = await getDoc(studentDocRef);
        if (studentDoc.exists()) {
            const currentProgress = studentDoc.data()?.progress ?? {};
            // This is a simple average, adjust logic as needed (e.g., weight by task type)
            const allGrades = await getGrades(studentId);
            const totalScore = allGrades.reduce((sum, grade) => sum + grade.score, 0);
            const averageScore = allGrades.length > 0 ? totalScore / allGrades.length : 0;

            await updateDoc(studentDocRef, {
                'progress.overall': averageScore, // Store overall average or specific subject progress
            });
            console.log(`Updated overall progress for student ${studentId}`);
        }

    } catch (error: any) {
        console.error("Error saving grade:", error.message);
    }
}



export { getUserData, createUserDocument, saveGrade, getUserDataByUid, auth, db, getGrades }; // Removed initializeDataIfNeeded
export type { Student, Teacher }; // Export types if needed elsewhere