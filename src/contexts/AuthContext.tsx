import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { fetchAccessConfig, canCreateTrips } from "@/lib/accessConfig";
import type { UserProfile } from "../types";

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  /**
   * True when the user may create new trips.
   * False while access config is loading, and in invite_only mode if their
   * email is not on the allow list. They can still join trips via share links.
   */
  canCreateTrips: boolean;
  /** True until appConfig/access has been loaded (or failed) for the signed-in user. */
  accessLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Fail closed: do not show create UI until we know the user is allowed.
  const [canCreate, setCanCreate] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          email: firebaseUser.email,
        });
        setAccessLoading(true);
        setCanCreate(false);
        try {
          const config = await fetchAccessConfig();
          setCanCreate(canCreateTrips(firebaseUser.email, config));
        } catch (err) {
          // Fail closed so create controls stay hidden if config is unreadable.
          console.warn("[access] could not load appConfig/access", err);
          setCanCreate(false);
        } finally {
          setAccessLoading(false);
        }
      } else {
        setUser(null);
        setCanCreate(false);
        setAccessLoading(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        canCreateTrips: canCreate,
        accessLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
