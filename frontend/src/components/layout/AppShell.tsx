import { UserButton } from "@clerk/clerk-react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAppAuth } from "../../auth/AuthContext";

export function AppShell() {
  const location = useLocation();
  const isLibraryPage = location.pathname === "/";
  const { user, isAdmin } = useAppAuth();

  return (
    <div className="min-h-screen text-ink-900">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="font-display text-3xl font-semibold tracking-wide text-ink-900"
            >
              Novel Reader
            </Link>
            {isAdmin ? (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-amber-900">
                Admin
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-4">
            {isLibraryPage ? null : (
              <nav className="flex items-center gap-2 rounded-full border border-black/5 bg-white/80 p-1 text-sm shadow-panel">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    [
                      "rounded-full px-4 py-2 transition",
                      isActive ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100",
                    ].join(" ")
                  }
                >
                  Library
                </NavLink>
              </nav>
            )}
            <div className="flex items-center gap-3 rounded-full border border-black/5 bg-white/80 px-3 py-2 shadow-panel">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-ink-900">{user?.email}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-ink-500">{user?.role}</p>
              </div>
              <UserButton afterSignOutUrl="/sign-in" />
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
