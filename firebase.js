
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "PASTE_CORRECT_API_KEY_HERE",
  authDomain: "rcreferral-contest.firebaseapp.com",
  databaseURL: "https://rcreferral-contest-default-rtdb.firebaseio.com",
  projectId: "rcreferral-contest",
  storageBucket: "rcreferral-contest.firebasestorage.app",
  messagingSenderId: "137378826916",
  appId: "1:137378826916:web:45b695d41fbd3eb940f431",
  measurementId: "G-9QCXRR9V56"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export {
  app,
  auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
};
