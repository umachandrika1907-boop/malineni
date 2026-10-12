import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBsNfXfVU0H7C-hx4OG4TaGb9Nz44-jOhM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "edus-1150d.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "edus-1150d",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "edus-1150d.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "430763576494",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:430763576494:web:14f6397d922abc9935b13f",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-0PN6CP3XNS",
};

// Initialize Firebase app (prevent duplicate initialization during HMR)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Cloud Firestore Database
export const db: Firestore = getFirestore(app);

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);

// Initialize Firebase Analytics safely (checks browser compatibility)
export let analytics: Analytics | null = null;

if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log('Firebase Analytics initialized successfully');
    }
  }).catch((err) => {
    console.warn('Firebase Analytics not supported in this environment:', err);
  });
}
