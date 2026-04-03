import { Outlet } from "react-router-dom";

export function ReaderShell() {
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  );
}
