import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBDx3j-Dlq0EUSrl4CnjXs9-3wbrNnffb0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ranking-vape.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ranking-vape",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ranking-vape.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "118013433053",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:118013433053:web:94a7c23390c213f2afb734",
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

export const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;
export { hasFirebaseConfig };
