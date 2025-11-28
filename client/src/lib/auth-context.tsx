import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
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

// --- Types and Context --- 
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

// --- Helper Functions --- 
const isMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const actionCodeSettings = {
    url: `${window.location.origin}/link-account`,
    handleCodeInApp: true, 
};

// --- Auth Provider Component --- 
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
    const allPrimaryIds = [...(primaryUserData.settings?.multiAccountIds || []), primaryUser.uid];

    // Create the new account document if it doesn't exist
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

    // Update only the primary user's document to add the new account
    batch.update(primaryUserDocRef, { "settings.multiAccountIds": arrayUnion(newAccountId) });
    
    await batch.commit();
    console.log("Batch committed successfully, refreshing linked accounts...");
    
    // Immediately refresh linked accounts to update the UI
    const userDocRef = doc(db, "users", primaryUser.uid);
    const updatedUserDocSnap = await getDoc(userDocRef);
    console.log("Updated user doc exists:", updatedUserDocSnap.exists());
    
    if (updatedUserDocSnap.exists()) {
      const freshUserData = updatedUserDocSnap.data() as User;
      console.log("Fresh user data multiAccountIds:", freshUserData.settings?.multiAccountIds);
      
      const accountIds = Array.from(new Set([freshUserData.id, ...(freshUserData.settings?.multiAccountIds || [])]));
      console.log("Account IDs to query:", accountIds);
      
      if (accountIds.length > 0) {
        const usersQuery = query(collection(db, "users"), where(documentId(), "in", accountIds));
        const querySnapshot = await getDocs(usersQuery);
        console.log("Query returned", querySnapshot.docs.length, "accounts");
        
        const accounts = querySnapshot.docs.map(d => {
          const data = { ...d.data(), id: d.id } as User;
          console.log("Account found:", data.id, data.email, data.displayName);
          return data;
        });
        
        console.log("Setting linkedAccounts with", accounts.length, "accounts");
        setLinkedAccounts(accounts);
        setUserData(freshUserData);
      }
    }
    
    toast({ title: "Account Linked!", description: `Successfully linked ${newUser.email}.` });

  }, [toast]);

  // Handles redirect flows for Google and Email linking
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

  // Core listener for all user and account data
  useEffect(() => {
    let userDocUnsubscribe: (() => void) | null = null;
    let moodUnsubscribe: (() => void) | null = null;
    let linkedAccountsUnsubscribe: (() => void) | null = null;

    const authStateUnsubscribe = onAuthStateChanged(auth, (user) => {
      // Clean up all old listeners whenever auth state changes
      userDocUnsubscribe?.();
      moodUnsubscribe?.();
      linkedAccountsUnsubscribe?.();

      setCurrentUser(user);
      setLoading(true);

      if (user) {
        // 1. Listen to the primary user's document
        const userDocRef = doc(db, "users", user.uid);
        userDocUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
          const newUserData = docSnap.exists() ? docSnap.data() as User : null;
          setUserData(newUserData);

          // 2. When primary user data changes, update the linked accounts listener
          linkedAccountsUnsubscribe?.(); // Clean up the old listener first

          if (newUserData) {
            const accountIds = Array.from(new Set([newUserData.id, ...(newUserData.settings?.multiAccountIds || [])]));
            console.log("Setting up linked accounts listener with IDs:", accountIds);
            
            if (accountIds.length === 0) {
              setLinkedAccounts([]);
              return;
            }
            
            // For IDs beyond 10, we need to batch the queries (Firestore limit)
            const usersQuery = query(collection(db, "users"), where(documentId(), "in", accountIds.slice(0, 10)));
            linkedAccountsUnsubscribe = onSnapshot(usersQuery, (querySnapshot) => {
              const accounts = querySnapshot.docs.map(d => ({ ...d.data(), id: d.id } as User));
              console.log("Linked accounts listener received", accounts.length, "accounts out of", accountIds.length, "expected");
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
        });

        // 3. Listen to today's mood
        const today = new Date().toISOString().split('T')[0];
        const moodsQuery = query(collection(db, "moods"), where("userId", "==", user.uid), where("date", "==", today), limit(1));
        moodUnsubscribe = onSnapshot(moodsQuery, (snapshot) => {
          setTodayMood(snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as MoodEntry);
          setLoading(false); // Considered loaded after mood is checked
        }, (error) => {
            console.error("Error listening to moods:", error);
            setLoading(false);
        });

      } else {
        // User is logged out, clear all data and stop loading
        setUserData(null);
        setTodayMood(null);
        setLinkedAccounts([]);
        setLoading(false);
      }
    });

    // Main cleanup on component unmount
    return () => {
      authStateUnsubscribe();
      userDocUnsubscribe?.();
      moodUnsubscribe?.();
      linkedAccountsUnsubscribe?.();
    };
  }, []); // Empty dependency array ensures this runs only once on mount


  // --- Authentication Actions ---
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
    
    const userDocRef = doc(db, "users", user.uid);
    const userDocSnap = await getDoc(userDocRef);
    
    if (!userDocSnap.exists()) {
      const displayName = window.localStorage.getItem('displayNameForSignUp') || email.split('@')[0];
      const userForDb = {
        id: user.uid,
        email: user.email!,
        displayName: displayName,
        username: email.split('@')[0],
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
    }
    
    window.localStorage.removeItem('emailForSignIn');
    window.localStorage.removeItem('displayNameForSignUp');
  };
  
  const signInWithGoogle = async () => { 
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider).catch(error => {
      toast({ title: "Sign-in Failed", description: handleFirebaseError(error), variant: "destructive"});
    });
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
        return true; // Redirect initiated successfully
      } else {
        const result = await signInWithPopup(secondaryAuth, provider);
        await firebaseSignOut(secondaryAuth);
        await handleAccountLink(result.user);
        return true; // Account linked successfully
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        return false; // User cancelled, not an error
      }
      toast({ title: "Link Failed", description: handleFirebaseError(error), variant: "destructive" });
      return false;
    }
  };


  // Function to manually refresh linked accounts from Firestore
  const refreshLinkedAccounts = useCallback(async () => {
    if (!currentUser || !userData) return;
    
    try {
      // Re-fetch the current user's document to get updated multiAccountIds
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const freshUserData = { ...userDocSnap.data(), id: userDocSnap.id } as User;
        const accountIds = Array.from(new Set([freshUserData.id, ...(freshUserData.settings?.multiAccountIds || [])]));
        
        if (accountIds.length > 0) {
          const usersQuery = query(collection(db, "users"), where(documentId(), "in", accountIds));
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
    
    const allAccountIds = [userData.id, ...userData.settings.multiAccountIds];
    const batch = writeBatch(db);

    // Remove the target account's ID from all other linked accounts
    allAccountIds.forEach(id => {
        if(id !== accountId) {
            batch.update(doc(db, "users", id), { "settings.multiAccountIds": arrayRemove(accountId) });
        }
    });

    // Clear the multiAccountIds for the removed account and leave only the other IDs
    const otherAccountIds = allAccountIds.filter(id => id !== accountId);
    batch.update(doc(db, "users", accountId), { "settings.multiAccountIds": otherAccountIds });

    await batch.commit();
    
    // Refresh the linked accounts list after removing
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
