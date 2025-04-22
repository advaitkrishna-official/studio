// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export { app };



