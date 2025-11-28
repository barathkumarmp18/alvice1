import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const requiredConfigKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length > 0) {
  throw new Error(`Firebase configuration error: Missing keys - ${missingKeys.join(', ')}`);
}

// Initialize primary and secondary Firebase apps
const primaryApp = initializeApp(firebaseConfig);
const secondaryApp = initializeApp(firebaseConfig, "secondary");

console.log('✅ Firebase Apps initialized successfully');

export const auth = getAuth(primaryApp);
export const secondaryAuth = getAuth(secondaryApp);
export const db = getFirestore(primaryApp);
export const storage = getStorage(primaryApp);

let analytics: any = null;
isSupported().then(supported => {
  if (supported) analytics = getAnalytics(primaryApp);
});
export { analytics };

// Connect to emulators if in development
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
    console.log("---");
    console.log(" smoky | Connecting to Firebase Emulators");
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectAuthEmulator(secondaryAuth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
    console.log(" smoky | Success!");
    console.log("---");
}

export function handleFirebaseError(error: any): string {
  console.error('Firebase Error:', error);
  const code = error.code || '';

  switch (code) {
    case 'auth/user-not-found': return 'No account found with this email.';
    case 'auth/wrong-password': return 'Incorrect password.';
    case 'auth/email-already-in-use': return 'This email is already registered.';
    // ... more cases
    default: return error.message || 'An unexpected error occurred.';
  }
}
