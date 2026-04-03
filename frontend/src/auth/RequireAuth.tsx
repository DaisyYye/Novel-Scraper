import { useAuth } from "@clerk/clerk-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppAuth } from "./AuthContext";

export function RequireAuth() {
  const location = useLocation();
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading, user } = useAppAuth();

  if (!isLoaded || isLoading) {
    return <div className="px-6 py-10 text-sm text-ink-500">Checking your session...</div>;
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace state={{ from: location }} />;
  }

  if (!user) {
    return <div className="px-6 py-10 text-sm text-red-700">Unable to load your account.</div>;
  }

  return <Outlet />;
}
