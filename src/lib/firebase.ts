// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, indexedDBLocalPersistence } from "firebase/auth";

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
let app;

try {
  app = initializeApp(firebaseConfig);
} catch (error: any) {
  console.error("Firebase initialization error:", error.message);
}

// Initialize Firebase Authentication and persist the user's session
let auth;
if (typeof window !== 'undefined') {
  try {
    auth = initializeAuth(app, {
      persistence: indexedDBLocalPersistence,
    });
  } catch (error: any) {
    console.error("Firebase Auth initialization error:", error.message);
  }
} else {
  if (app) {
    auth = getAuth(app);
  }
}

export { app, auth };
