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
import {
  fetchAccessConfig,
  isEmailAllowed,
  InviteOnlyError,
} from "@/lib/accessConfig";
import type { UserProfile } from "../types";

interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  /** True when the last auth attempt was blocked by invite-only mode. */
  accessDenied: boolean;
  clearAccessDenied: () => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function assertAccessAllowed(email: string | null): Promise<void> {
  const config = await fetchAccessConfig();
  if (!isEmailAllowed(email, config)) {
    throw new InviteOnlyError();
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          await assertAccessAllowed(firebaseUser.email);
          setUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            email: firebaseUser.email,
          });
          setAccessDenied(false);
        } catch (err) {
          await firebaseSignOut(auth);
          setUser(null);
          if (err instanceof InviteOnlyError) {
            setAccessDenied(true);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async () => {
    setAccessDenied(false);
    const credential = await signInWithPopup(auth, googleProvider);
    try {
      await assertAccessAllowed(credential.user.email);
    } catch (err) {
      await firebaseSignOut(auth);
      if (err instanceof InviteOnlyError) {
        setAccessDenied(true);
      }
      throw err;
    }
  };

  const signOut = async () => {
    setAccessDenied(false);
    await firebaseSignOut(auth);
  };

  const clearAccessDenied = () => setAccessDenied(false);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        accessDenied,
        clearAccessDenied,
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
