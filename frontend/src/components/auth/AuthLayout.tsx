import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(153,123,80,0.22),_transparent_30%),linear-gradient(180deg,_#f8f2ea_0%,_#efe4d4_100%)] px-6 py-10 text-ink-900">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <section className="rounded-[36px] border border-black/5 bg-white/55 p-8 shadow-panel backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.24em] text-ink-500">Novel Reader</p>
          <h1 className="mt-4 font-display text-5xl leading-tight text-ink-900">
            Sign in to keep every book, chapter, and reading preference attached to your account.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-ink-600">
            Clerk handles authentication, while the app keeps roles, progress, and reader settings
            in the backend.
          </p>
        </section>

        <div className="flex justify-center lg:justify-end">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
