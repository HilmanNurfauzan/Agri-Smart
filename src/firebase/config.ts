// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  Firestore,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
} from "firebase/firestore";

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with memory-only cache (no persistence)
// React Native does not support IndexedDB, so persistentLocalCache fails.
// memoryLocalCache ensures getDocs always fetches fresh data from server.
let firestore: Firestore;
try {
  firestore = initializeFirestore(app, {
    localCache: memoryLocalCache(),
  });
} catch (e) {
  // If already initialized, just get the instance
  firestore = getFirestore(app);
}

export { app, firestore };
