import { useAuth } from "@clerk/clerk-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { setAuthTokenGetter } from "../lib/authToken";
import { getCurrentUser } from "../services/readerAppService";
import type { AppUser } from "../types/auth";

type AppAuthContextValue = {
  user: AppUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
};

const AppAuthContext = createContext<AppAuthContextValue | null>(null);

export function AppAuthProvider({ children }: PropsWithChildren) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(isSignedIn ? async () => getToken() : async () => null);

    return () => {
      setAuthTokenGetter(null);
    };
  }, [getToken, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getCurrentUser()
      .then((currentUser) => {
        if (!cancelled) {
          setUser(currentUser);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, userId]);

  const value = useMemo<AppAuthContextValue>(
    () => ({
      user,
      isAdmin: user?.role === "admin",
      isLoading: !isLoaded || isLoading,
      refreshUser: async () => {
        if (!isSignedIn) {
          setUser(null);
          return;
        }

        const currentUser = await getCurrentUser();
        setUser(currentUser);
      },
    }),
    [isLoaded, isLoading, isSignedIn, user],
  );

  return <AppAuthContext.Provider value={value}>{children}</AppAuthContext.Provider>;
}

export function useAppAuth() {
  const context = useContext(AppAuthContext);
  if (!context) {
    throw new Error("useAppAuth must be used inside AppAuthProvider.");
  }

  return context;
}
