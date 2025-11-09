// Firebase configuration with comprehensive error handling
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// Validate Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Check if all required config values are present
const requiredConfigKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

if (missingKeys.length > 0) {
  console.error('❌ Missing Firebase configuration keys:', missingKeys);
  throw new Error(`Firebase configuration error: Missing keys - ${missingKeys.join(', ')}`);
}

console.log('✅ Firebase Config Loaded:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  storageBucket: firebaseConfig.storageBucket
});

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase App initialized successfully');
} catch (error: any) {
  console.error('❌ Firebase initialization error:', error);
  throw new Error(`Failed to initialize Firebase: ${error.message}`);
}

// Initialize Firebase services with error handling
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics only if supported (not in all environments)
let analytics: any = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
    console.log('✅ Firebase Analytics initialized');
  } else {
    console.log('ℹ️ Firebase Analytics not supported in this environment');
  }
}).catch((error) => {
  console.warn('⚠️ Firebase Analytics initialization skipped:', error.message);
});

export { analytics };

// Helper function to handle Firebase errors
export function handleFirebaseError(error: any): string {
  console.error('Firebase Error:', error);
  
  // Auth errors
  if (error.code?.startsWith('auth/')) {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'This email is already registered.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized for OAuth operations. Please add it to Firebase Console.';
      case 'auth/popup-blocked':
        return 'Sign-in popup was blocked by the browser.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in popup was closed before completion.';
      default:
        return `Authentication error: ${error.message}`;
    }
  }
  
  // Firestore errors
  if (error.code?.startsWith('firestore/')) {
    switch (error.code) {
      case 'firestore/permission-denied':
        return 'You do not have permission to perform this action.';
      case 'firestore/unavailable':
        return 'Firestore service is temporarily unavailable. Please try again.';
      case 'firestore/unauthenticated':
        return 'You must be signed in to perform this action.';
      case 'firestore/failed-precondition':
        return 'This operation requires an index. Please check the console for the index creation link.';
      default:
        return `Database error: ${error.message}`;
    }
  }
  
  // Storage errors
  if (error.code?.startsWith('storage/')) {
    switch (error.code) {
      case 'storage/unauthorized':
        return 'You do not have permission to access this file.';
      case 'storage/unauthenticated':
        return 'You must be signed in to upload files.';
      case 'storage/retry-limit-exceeded':
        return 'Upload failed after multiple retries. Please check your connection.';
      case 'storage/invalid-checksum':
        return 'File upload failed. Please try again.';
      case 'storage/canceled':
        return 'Upload was cancelled.';
      case 'storage/unknown':
        return 'An unknown error occurred during upload.';
      case 'storage/object-not-found':
        return 'File not found.';
      case 'storage/quota-exceeded':
        return 'Storage quota exceeded.';
      default:
        return `Storage error: ${error.message}`;
    }
  }
  
  // Generic errors
  if (error.message?.includes('Missing or insufficient permissions')) {
    return 'Missing or insufficient permissions. Please check Firestore security rules.';
  }
  
  if (error.message?.includes('requires an index')) {
    return 'This query requires a database index. Please check the console for setup instructions.';
  }
  
  return error.message || 'An unexpected error occurred. Please try again.';
}

console.log('🚀 Firebase SDK ready');
