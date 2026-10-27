
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDxDjlzI_lEI1MbswR4lBbPJ8zspMRYdOY",
  authDomain: "rcreferral-contest.firebaseapp.com",
  databaseURL:
    "https://rcreferral-contest-default-rtdb.firebaseio.com",
  projectId: "rcreferral-contest",
  storageBucket: "rcreferral-contest.firebasestorage.app",
  messagingSenderId: "137378826916",
  appId: "1:137378826916:web:45b695d41fbd3eb940f431",
  measurementId: "G-9QCXRR9V56"
};

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const database = getDatabase(app);

let analytics = null;

if (typeof window !== "undefined") {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch((error) => {
      console.warn("Firebase Analytics unavailable:", error);
    });
}

export { app, auth, db, database, analytics };
