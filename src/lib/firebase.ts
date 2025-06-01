
// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// import { getAuth } from "firebase/auth"; // If you need auth later
// import { getStorage } from "firebase/storage"; // If you need Firebase Storage later

const firebaseConfig = {
  apiKey: "AIzaSyAhp_WpgbS4ugo8QO9wII5-D05Y0-_kGEI",
  authDomain: "chronoscore.firebaseapp.com",
  projectId: "chronoscore",
  storageBucket: "chronoscore.firebasestorage.app",
  messagingSenderId: "71560687267",
  appId: "1:71560687267:web:7cb87030f8ca496ad25916"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
// const auth = getAuth(app); // If you need auth
// const storage = getStorage(app); // If you need storage

export { db /*, auth, storage */ };
