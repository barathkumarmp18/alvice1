import { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  type User as FirebaseUser
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, handleFirebaseError } from "./firebase";
import type { User } from "@shared/schema";

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (uid: string) => {
    try {
      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data() as User);
      }
    } catch (error: any) {
      console.error('Error fetching user data:', handleFirebaseError(error));
      // Don't throw - allow app to continue, user can retry
    }
  };

  const refreshUserData = async () => {
    if (currentUser) {
      await fetchUserData(currentUser.uid);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user.uid);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Check if user document exists, if not create basic profile
    const userDoc = await getDoc(doc(db, "users", result.user.uid));
    if (!userDoc.exists()) {
      const newUser: Omit<User, 'id'> = {
        email: result.user.email!,
        displayName: result.user.displayName || "User",
        username: result.user.email!.split('@')[0],
        photoURL: result.user.photoURL || undefined,
        role: "explorer",
        interests: [],
        contentPreferences: [],
        followers: [],
        following: [],
        createdAt: new Date().toISOString(),
        profileSetupComplete: false,
        settings: {
          diaryPublic: true,
          allowAnonymousMessages: true,
          multiAccountIds: [],
        },
      };
      await setDoc(doc(db, "users", result.user.uid), { ...newUser, id: result.user.uid });
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string, displayName: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    const newUser: Omit<User, 'id'> = {
      email,
      displayName,
      username: email.split('@')[0],
      role: "explorer",
      interests: [],
      contentPreferences: [],
      followers: [],
      following: [],
      createdAt: new Date().toISOString(),
      profileSetupComplete: false,
      settings: {
        diaryPublic: true,
        allowAnonymousMessages: true,
        multiAccountIds: [],
      },
    };
    await setDoc(doc(db, "users", result.user.uid), { ...newUser, id: result.user.uid });
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const value = {
    currentUser,
    userData,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
