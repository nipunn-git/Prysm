import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  OAuthProvider, 
  browserLocalPersistence, 
  setPersistence 
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDDtwFhszfgJxh5J8yEV0JPjVp9wU4LRbw",
  authDomain: "prompthub-fdfe7.firebaseapp.com",
  projectId: "prompthub-fdfe7",
  storageBucket: "prompthub-fdfe7.firebasestorage.app",
  messagingSenderId: "196018619695",
  appId: "1:196018619695:web:8be92b8d7dc5207267cdda",
  measurementId: "G-N397TG7SRR"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

// Explicitly ensure local persistence for all browsers (Opera, Safari, Chrome, Firefox, Edge, Brave)
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn("Firebase persistence setup notice:", err);
  });
}

// Google OAuth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Apple OAuth Provider - Configured for cross-browser & Apple ID specifications
const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');
// Note: Apple does not accept Google's prompt parameter, which causes invalid_request errors in some browsers.
appleProvider.setCustomParameters({
  locale: 'en'
});

export { auth, googleProvider, appleProvider };
