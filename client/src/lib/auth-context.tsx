import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  type User as FirebaseUser,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, query, collection, where, limit, updateDoc, arrayUnion, arrayRemove, getDocs, writeBatch, documentId } from "firebase/firestore";
import { auth, db, handleFirebaseError, secondaryAuth } from "./firebase";
import type { User, MoodEntry } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  todayMood: MoodEntry | null;
  loading: boolean;
  linkedAccounts: User[];
  signInWithGoogle: () => Promise<void>;
  signInWithEmailOTP: (email: string, displayName?: string) => Promise<void>;
  completeEmailOTPSignIn: (email: string, url: string) => Promise<void>;
  signOut: () => Promise<void>;
  linkWithGoogle: () => Promise<boolean>;
  removeLinkedAccount: (accountId: string) => Promise<void>;
  switchAccount: (targetAccountId: string) => Promise<void>;
  refreshLinkedAccounts: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

const isMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const actionCodeSettings = {
    url: `${window.location.origin}/link-account`,
    handleCodeInApp: true, 
};

async function createUserDocumentIfNeeded(user: FirebaseUser): Promise<void> {
  const userDocRef = doc(db, "users", user.uid);
  const userDocSnap = await getDoc(userDocRef);
  
  if (!userDocSnap.exists()) {
    console.log("Creating new user document for:", user.uid);
    const userForDb = {
      id: user.uid,
      email: user.email || "",
      displayName: user.displayName || user.email?.split('@')[0] || "User",
      username: user.email?.split('@')[0] || `user_${user.uid.substring(0, 8)}`,
      ...(user.photoURL && { photoURL: user.photoURL }),
      role: "explorer" as const,
      interests: [],
      contentPreferences: [],
      followers: [],
      following: [],
      createdAt: new Date().toISOString(),
      profileSetupComplete: false,
      settings: { 
        diaryPublic: false,
        allowAnonymousMessages: true,
        multiAccountIds: [] 
      }
    };
    await setDoc(userDocRef, userForDb);
    console.log("User document created successfully");
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [todayMood, setTodayMood] = useState<MoodEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkedAccounts, setLinkedAccounts] = useState<User[]>([]);
  const { toast } = useToast();

  const handleAccountLink = useCallback(async (newUser: FirebaseUser) => {
    const primaryUser = auth.currentUser;
    if (!primaryUser) throw new Error("Not signed in");

    const newAccountId = newUser.uid;
    const primaryUserDocRef = doc(db, "users", primaryUser.uid);
    const primaryUserDocSnap = await getDoc(primaryUserDocRef);
    
    if (!primaryUserDocSnap.exists()) {
        toast({ title: "Error", description: "Primary user profile not found.", variant: "destructive" });
        return;
    }
    const primaryUserData = primaryUserDocSnap.data() as User;

    if (newAccountId === primaryUser.uid || primaryUserData.settings?.multiAccountIds?.includes(newAccountId)) {
      toast({ title: "Already Linked", description: "This account is already part of your profile." });
      return;
    }

    const batch = writeBatch(db);
    const newUserDocRef = doc(db, "users", newAccountId);
    const newUserDocSnap = await getDoc(newUserDocRef);

    if (!newUserDocSnap.exists()) {
      console.log("Creating new user document for linked account:", newAccountId);
      const userForDb = {
        id: newAccountId,
        email: newUser.email!,
        displayName: newUser.displayName || newUser.email!.split('@')[0],
        username: newUser.email!.split('@')[0],
        ...(newUser.photoURL && { photoURL: newUser.photoURL }),
        role: "explorer" as const,
        interests: [],
        contentPreferences: [],
        followers: [],
        following: [],
        createdAt: new Date().toISOString(),
        profileSetupComplete: false,
        settings: { 
          diaryPublic: false,
          allowAnonymousMessages: true,
          multiAccountIds: [primaryUser.uid]
        }
      };
      batch.set(newUserDocRef, userForDb);
    } else {
      console.log("User document already exists for linked account:", newAccountId);
      batch.update(newUserDocRef, { "settings.multiAccountIds": arrayUnion(primaryUser.uid) });
    }

    batch.update(primaryUserDocRef, { "settings.multiAccountIds": arrayUnion(newAccountId) });
    
    await batch.commit();
    console.log("Batch committed successfully, refreshing linked accounts...");
    
    const userDocRef = doc(db, "users", primaryUser.uid);
    const updatedUserDocSnap = await getDoc(userDocRef);
    
    if (updatedUserDocSnap.exists()) {
      const freshUserData = updatedUserDocSnap.data() as User;
      const accountIds = [freshUserData.id, ...(freshUserData.settings?.multiAccountIds || [])].filter(Boolean);
      const uniqueAccountIds = Array.from(new Set(accountIds));
      
      if (uniqueAccountIds.length > 0) {
        const usersQuery = query(collection(db, "users"), where(documentId(), "in", uniqueAccountIds));
        const querySnapshot = await getDocs(usersQuery);
        const accounts = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as User));
        setLinkedAccounts(accounts);
        setUserData(freshUserData);
      }
    }
    
    toast({ title: "Account Linked!", description: `Successfully linked ${newUser.email}.` });

  }, [toast]);

  useEffect(() => {
    const processRedirects = async () => {
      try {
        const result = await getRedirectResult(secondaryAuth);
        if (result && auth.currentUser) {
          toast({ title: "Finalizing link...", duration: 2000 });
          await handleAccountLink(result.user);
          await firebaseSignOut(secondaryAuth);
        }
      } catch(error: any) {
        toast({ title: "Failed to Link", description: handleFirebaseError(error), variant: "destructive" });
      }

      if (isSignInWithEmailLink(auth, window.location.href) && auth.currentUser) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
            toast({ title: "Email required", description: "Please enter your email again to complete the link.", variant: "destructive" });
            return;
        }

        try {
          const result = await signInWithEmailLink(secondaryAuth, email, window.location.href);
          if (result.user) {
            await handleAccountLink(result.user);
            await firebaseSignOut(secondaryAuth);
          }
          window.localStorage.removeItem('emailForSignIn');
        } catch (error: any) {
          toast({ title: "Failed to Link with Email", description: handleFirebaseError(error), variant: "destructive" });
        } finally {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    processRedirects();
  }, [toast, handleAccountLink]);

  useEffect(() => {
    let userDocUnsubscribe: (() => void) | null = null;
    let moodUnsubscribe: (() => void) | null = null;
    let linkedAccountsUnsubscribe: (() => void) | null = null;

    const authStateUnsubscribe = onAuthStateChanged(auth, async (user) => {
      userDocUnsubscribe?.();
      moodUnsubscribe?.();
      linkedAccountsUnsubscribe?.();

      setCurrentUser(user);

      if (user) {
        setLoading(true);
        
        try {
          await createUserDocumentIfNeeded(user);
        } catch (error) {
          console.error("Error creating user document:", error);
        }

        const userDocRef = doc(db, "users", user.uid);
        userDocUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
          const newUserData = docSnap.exists() ? { ...docSnap.data(), id: docSnap.id } as User : null;
          setUserData(newUserData);

          linkedAccountsUnsubscribe?.();

          if (newUserData && newUserData.id) {
            const accountIds = [newUserData.id, ...(newUserData.settings?.multiAccountIds || [])].filter(Boolean);
            const uniqueAccountIds = Array.from(new Set(accountIds));
            
            console.log("Setting up linked accounts listener with IDs:", uniqueAccountIds);
            
            if (uniqueAccountIds.length === 0) {
              setLinkedAccounts([]);
              setLoading(false);
              return;
            }
            
            const usersQuery = query(collection(db, "users"), where(documentId(), "in", uniqueAccountIds.slice(0, 10)));
            linkedAccountsUnsubscribe = onSnapshot(usersQuery, (querySnapshot) => {
              const accounts = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as User));
              console.log("Linked accounts listener received", accounts.length, "accounts");
              setLinkedAccounts(accounts);
            }, (error) => {
                console.error("Error listening to linked accounts:", error);
                setLinkedAccounts(newUserData ? [newUserData] : []);
            });
          } else {
             setLinkedAccounts([]);
          }
        }, (error) => {
            console.error("Error listening to user document:", error);
            setUserData(null);
            setLoading(false);
        });

        const today = new Date().toISOString().split('T')[0];
        const moodsQuery = query(collection(db, "moods"), where("userId", "==", user.uid), where("date", "==", today), limit(1));
        moodUnsubscribe = onSnapshot(moodsQuery, (snapshot) => {
          setTodayMood(snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as MoodEntry);
          setLoading(false);
        }, (error) => {
            console.error("Error listening to moods:", error);
            setLoading(false);
        });

      } else {
        setUserData(null);
        setTodayMood(null);
        setLinkedAccounts([]);
        setLoading(false);
      }
    });

    return () => {
      authStateUnsubscribe();
      userDocUnsubscribe?.();
      moodUnsubscribe?.();
      linkedAccountsUnsubscribe?.();
    };
  }, []);

  const signInWithEmailOTP = async (email: string, displayName?: string) => {
    const otpActionCodeSettings = {
      url: `${window.location.origin}/auth`,
      handleCodeInApp: true,
    };
    
    await sendSignInLinkToEmail(auth, email, otpActionCodeSettings);
    window.localStorage.setItem('emailForSignIn', email);
    if (displayName) {
      window.localStorage.setItem('displayNameForSignUp', displayName);
    }
    toast({ 
      title: "Check your email!", 
      description: `We've sent a sign-in link to ${email}. Click the link to continue.` 
    });
  };

  const completeEmailOTPSignIn = async (email: string, url: string) => {
    const userCredential = await signInWithEmailLink(auth, email, url);
    const user = userCredential.user;
    
    await createUserDocumentIfNeeded(user);
    
    window.localStorage.removeItem('emailForSignIn');
    window.localStorage.removeItem('displayNameForSignUp');
  };
  
  const signInWithGoogle = async () => { 
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        await createUserDocumentIfNeeded(result.user);
      }
    } catch (error: any) {
      toast({ title: "Sign-in Failed", description: handleFirebaseError(error), variant: "destructive"});
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    window.localStorage.removeItem('preferredSignInEmail');
  };

  const linkWithGoogle = async (): Promise<boolean> => {
    if (!currentUser || !userData) throw new Error("No primary user signed in.");
    if ((userData.settings?.multiAccountIds?.length || 0) >= 2) {
        toast({ title: "Limit Reached", description: "You can link a maximum of 3 accounts.", variant: "destructive"});
        return false;
    }

    const provider = new GoogleAuthProvider();
    try {
      if (isMobileDevice()) {
        await signInWithRedirect(secondaryAuth, provider);
        return true;
      } else {
        const result = await signInWithPopup(secondaryAuth, provider);
        await firebaseSignOut(secondaryAuth);
        await handleAccountLink(result.user);
        return true;
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        return false;
      }
      toast({ title: "Link Failed", description: handleFirebaseError(error), variant: "destructive" });
      return false;
    }
  };

  const refreshLinkedAccounts = useCallback(async () => {
    if (!currentUser || !userData) return;
    
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const freshUserData = { ...userDocSnap.data(), id: userDocSnap.id } as User;
        const accountIds = [freshUserData.id, ...(freshUserData.settings?.multiAccountIds || [])].filter(Boolean);
        const uniqueAccountIds = Array.from(new Set(accountIds));
        
        if (uniqueAccountIds.length > 0) {
          const usersQuery = query(collection(db, "users"), where(documentId(), "in", uniqueAccountIds));
          const querySnapshot = await getDocs(usersQuery);
          const accounts = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as User));
          setLinkedAccounts(accounts);
          setUserData(freshUserData);
        }
      }
    } catch (error) {
      console.error("Error refreshing linked accounts:", error);
    }
  }, [currentUser, userData]);

  const removeLinkedAccount = async (accountId: string) => {
    if (!currentUser || !userData?.settings?.multiAccountIds) return;
    
    const allAccountIds = [userData.id, ...userData.settings.multiAccountIds].filter(Boolean);
    const batch = writeBatch(db);

    allAccountIds.forEach(id => {
        if(id && id !== accountId) {
            batch.update(doc(db, "users", id), { "settings.multiAccountIds": arrayRemove(accountId) });
        }
    });

    const otherAccountIds = allAccountIds.filter(id => id !== accountId);
    if (accountId) {
      batch.update(doc(db, "users", accountId), { "settings.multiAccountIds": otherAccountIds });
    }

    await batch.commit();
    await refreshLinkedAccounts();
    
    toast({ title: "Account Unlinked", description: "The account has been removed from your profile." });
  };

  const switchAccount = async (targetAccountId: string) => {
    if (currentUser?.uid === targetAccountId) return;
    const targetAccount = linkedAccounts.find(acc => acc.id === targetAccountId);
    if (targetAccount) {
        await signOut();
        window.localStorage.setItem('preferredSignInEmail', targetAccount.email);
    }
  };

  const value = {
    currentUser, userData, todayMood, loading, linkedAccounts,
    signInWithGoogle, signInWithEmailOTP, completeEmailOTPSignIn, signOut, 
    linkWithGoogle, removeLinkedAccount, switchAccount, refreshLinkedAccounts
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
