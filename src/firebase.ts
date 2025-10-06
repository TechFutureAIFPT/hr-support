// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCddND9ciUpeL3xTpWTUMyQ0TG9FyUCdiU",
  authDomain: "gen-lang-client-0595612537.firebaseapp.com",
  databaseURL: "https://gen-lang-client-0595612537-default-rtdb.firebaseio.com",
  projectId: "gen-lang-client-0595612537",
  storageBucket: "gen-lang-client-0595612537.firebasestorage.app",
  messagingSenderId: "1022447215307",
  appId: "1:1022447215307:web:5fbf39694b90d420d2314e",
  measurementId: "G-9YGZ8Z594C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);