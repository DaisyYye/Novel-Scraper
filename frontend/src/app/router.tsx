import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { ReaderShell } from "../components/layout/ReaderShell";
import { LibraryPage } from "../pages/LibraryPage";
import { NovelDetailPage } from "../pages/NovelDetailPage";
import { ReaderPage } from "../pages/ReaderPage";

export const router = createBrowserRouter([
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
]);
