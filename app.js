// Rhockstar Connect Referral Contest starter.
// Replace the placeholder Firebase config below with the config from your Firebase web app.
// Do not put Firebase Admin SDK credentials or service-account keys in this file.

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-analytics.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDxDjlzI_lEI1MbswR4lBbPJ8zspMRYdOY",
  authDomain: "rcreferral-contest.firebaseapp.com",
  databaseURL: "https://rcreferral-contest-default-rtdb.firebaseio.com",
  projectId: "rcreferral-contest",
  storageBucket: "rcreferral-contest.firebasestorage.app",
  messagingSenderId: "137378826916",
  appId: "1:137378826916:web:45b695d41fbd3eb940f431",
  measurementId: "G-9QCXRR9V56"
};

const authView = document.querySelector("#authView");
const dashboardView = document.querySelector("#dashboardView");
const authForm = document.querySelector("#authForm");
const authMessage = document.querySelector("#authMessage");
const globalMessage = document.querySelector("#globalMessage");
const nameInput = document.querySelector("#name");
const nameLabel = document.querySelector("#nameLabel");
const authSubmit = document.querySelector("#authSubmit");
const logoutBtn = document.querySelector("#logoutBtn");
let mode = "login";
let firebaseReady = false;
let auth;
let db;

function setMessage(element, message, isError = false) {
  element.textContent = message;
  element.style.color = isError ? "#fca5a5" : "#86efac";
}
function setMode(nextMode) {
  mode = nextMode;
  const registering = mode === "register";
  nameInput.classList.toggle("hidden", !registering);
  nameLabel.classList.toggle("hidden", !registering);
  nameInput.required = registering;
  document.querySelector("#showLogin").classList.toggle("active", !registering);
  document.querySelector("#showRegister").classList.toggle("active", registering);
  authSubmit.textContent = registering ? "Create account" : "Log in";
  authMessage.textContent = "";
}
document.querySelector("#showLogin").addEventListener("click", () => setMode("login"));
document.querySelector("#showRegister").addEventListener("click", () => setMode("register"));

function makeReferralCode(uid) {
  // A readable, unique-enough public code. Firestore doc ID remains the actual user identity.
  return "RS" + uid.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
}
function getContestBaseUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}
function showDashboard(user, profile) {
  authView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  document.querySelector("#userName").textContent = profile.name || user.displayName || "Participant";
  document.querySelector("#referralCode").textContent = profile.referralCode || "Pending";
  const url = new URL(getContestBaseUrl());
  url.searchParams.set("ref", profile.referralCode || makeReferralCode(user.uid));
  document.querySelector("#referralLink").value = url.toString();
  document.querySelector("#clickCount").textContent = String(profile.clicks ?? 0);
  document.querySelector("#registrationCount").textContent = String(profile.registrations ?? 0);
  document.querySelector("#rankValue").textContent = "—";
}

async function loadProfile(user) {
  const ref = doc(db, "contestUsers", user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return snapshot.data();

  const profile = {
    uid: user.uid,
    name: user.displayName || "Participant",
    email: user.email || "",
    referralCode: makeReferralCode(user.uid),
    clicks: 0,
    registrations: 0,
    role: "participant",
    createdAt: serverTimestamp()
  };
  // This starter writes only to a new collection, preserving the old participants collection.
  await setDoc(ref, profile);
  return { ...profile, createdAt: null };
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!firebaseReady) {
    setMessage(authMessage, "Firebase is not configured yet. Add your Firebase web app config in app.js first.", true);
    return;
  }
  authSubmit.disabled = true;
  setMessage(authMessage, mode === "register" ? "Creating your account…" : "Logging in…");
  try {
    const email = document.querySelector("#email").value.trim();
    const password = document.querySelector("#password").value;
    if (mode === "register") {
      const name = nameInput.value.trim();
      if (!name) throw new Error("Please enter your full name.");
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });
      const profileRef = doc(db, "contestUsers", credential.user.uid);
      const profile = {
        uid: credential.user.uid, name, email: credential.user.email,
        referralCode: makeReferralCode(credential.user.uid),
        clicks: 0, registrations: 0, role: "participant",
        createdAt: serverTimestamp()
      };
      await setDoc(profileRef, profile);
      setMessage(authMessage, "Account created successfully.");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    setMessage(authMessage, friendlyError(error), true);
  } finally {
    authSubmit.disabled = false;
  }
});

function friendlyError(error) {
  const code = error?.code || "";
  const messages = {
    "auth/email-already-in-use": "An account with this email already exists. Please log in.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Choose a stronger password with at least 6 characters.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/network-request-failed": "Network error. Check your internet connection and try again.",
    "permission-denied": "Firebase blocked this action. Check your Firestore security rules."
  };
  return messages[code] || error?.message || "Something went wrong. Please try again.";
}

logoutBtn.addEventListener("click", async () => {
  if (auth) await signOut(auth);
});
document.querySelector("#copyLinkBtn").addEventListener("click", async () => {
  const input = document.querySelector("#referralLink");
  try {
    await navigator.clipboard.writeText(input.value);
    setMessage(document.querySelector("#copyMessage"), "Referral link copied.");
  } catch {
    input.select();
    setMessage(document.querySelector("#copyMessage"), "Select and copy the link manually.");
  }
});

const hasPlaceholder = Object.values(firebaseConfig).some(value => String(value).includes("PASTE_YOUR"));
if (!hasPlaceholder) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    firebaseReady = true;
    // Analytics is optional and may not be supported in every browser/environment.
    isSupported().then((supported) => {
      if (supported) getAnalytics(app);
    }).catch(() => {
      // Authentication and Firestore continue working if Analytics is unavailable.
    });
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        authView.classList.remove("hidden");
        dashboardView.classList.add("hidden");
        logoutBtn.classList.add("hidden");
        return;
      }
      try {
        const profile = await loadProfile(user);
        showDashboard(user, profile);
      } catch (error) {
        setMessage(globalMessage, friendlyError(error), true);
      }
    });
  } catch (error) {
    setMessage(globalMessage, "Firebase initialization failed: " + error.message, true);
  }
} else {
  setMessage(authMessage, "Starter ready. Add your Firebase web app configuration to connect it.", true);
}
