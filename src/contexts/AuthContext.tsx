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
import { isAdminEmail, resolveIsAdmin } from "@/lib/adminAccess";
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
  /** True only when admins/{email} exists. False while loading or on any failure. */
  isAdmin: boolean;
  /** True until the admin doc has been loaded (or failed) for the signed-in user. */
  adminLoading: boolean;
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          email: firebaseUser.email,
        });
        // The admin check runs alongside the access check and never delays
        // `loading` or `accessLoading`.
        setAdminLoading(true);
        setIsAdmin(false);
        if (!firebaseUser.email) {
          setIsAdmin(resolveIsAdmin({ exists: undefined }));
          setAdminLoading(false);
        } else {
          const email = firebaseUser.email;
          void isAdminEmail(email)
            .then(setIsAdmin)
            .catch((err: unknown) => {
              // Fail closed so admin UI stays hidden if the doc is unreadable.
              console.warn("[admin] could not load admins/{email}", err);
              setIsAdmin(false);
            })
            .finally(() => setAdminLoading(false));
        }
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
        setIsAdmin(false);
        setAdminLoading(false);
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
        isAdmin,
        adminLoading,
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
