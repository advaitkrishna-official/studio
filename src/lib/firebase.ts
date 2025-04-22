'use client';

// Import the functions you need from the SDKs you need
import { FirebaseApp, initializeApp } from "firebase/app";
import { getAuth, initializeAuth, indexedDBLocalPersistence, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore"; // Import getFirestore
import {useEffect, useState} from 'react';


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcqjDbNHsBYK8HfXMH_0_qMW6s_sOkxJo",
  authDomain: "eduai-5epn8.firebaseapp.com",
  projectId: "eduai-5epn8",
  storageBucket: "eduai-5epn8.firebasestorage.app",
  messagingSenderId: "25200449948",
  appId: "1:25200449948:web:fde24e3b765c7779e19059"
};

let app: FirebaseApp;
let auth: Auth | undefined;
let db: Firestore;

try {

  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = initializeAuth(app, {
    persistence: indexedDBLocalPersistence,
  });
} catch (error: any) {
  console.error("Firebase initialization error:", error.code);
}

export { app, auth, db };
