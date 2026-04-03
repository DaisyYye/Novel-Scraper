import { createBrowserRouter } from "react-router-dom";
import { PublicOnlyRoute } from "../auth/PublicOnlyRoute";
import { RequireAuth } from "../auth/RequireAuth";
import { AuthLayout } from "../components/auth/AuthLayout";
import { AppShell } from "../components/layout/AppShell";
import { ReaderShell } from "../components/layout/ReaderShell";
import { LibraryPage } from "../pages/LibraryPage";
import { NovelDetailPage } from "../pages/NovelDetailPage";
import { ReaderPage } from "../pages/ReaderPage";
import { SignInPage } from "../pages/SignInPage";
import { SignUpPage } from "../pages/SignUpPage";

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: "/sign-in",
            element: <SignInPage />,
          },
          {
            path: "/sign-in/*",
            element: <SignInPage />,
          },
          {
            path: "/sign-up",
            element: <SignUpPage />,
          },
          {
            path: "/sign-up/*",
            element: <SignUpPage />,
          },
        ],
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        path: "/",
        element: <AppShell />,
        children: [
          {
            index: true,
            element: <LibraryPage />,
          },
          {
            path: "novels/:novelId",
            element: <NovelDetailPage />,
          },
        ],
      },
      {
        path: "/read",
        element: <ReaderShell />,
        children: [
          {
            path: ":novelId/:chapterId",
            element: <ReaderPage />,
          },
        ],
      },
    ],
  },
]);
