import { Link, NavLink, Outlet } from "react-router-dom";

export function AppShell() {
  return (
    <div className="min-h-screen text-ink-900">
      <header className="sticky top-0 z-30 border-b border-black/5 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-3xl font-semibold tracking-wide text-ink-900">
            Novel Reader
          </Link>
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
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
