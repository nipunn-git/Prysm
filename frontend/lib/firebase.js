import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, OAuthProvider } from "firebase/auth";

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

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

const appleProvider = new OAuthProvider('apple.com');
appleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { auth, googleProvider, appleProvider };
