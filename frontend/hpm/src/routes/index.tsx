import { createBrowserRouter, Navigate } from "react-router-dom";
import Layout from "../components/layout/Layout";
import LoginPage from "../pages/auth/LoginPage";
import ChangePasswordPage from "../pages/auth/ChangePasswordPage";
import ProjectSelectPage from "../pages/project/ProjectSelectPage";
import ProjectCreatePage from "../pages/project/ProjectCreatePage";
import MeetingListPage from "../pages/meeting/MeetingListPage";
import MeetingCreatePage from "../pages/meeting/MeetingCreatePage";
import MeetingDetailPage from "../pages/meeting/MeetingDetailPage";
import MeetingMinutesPage from "../pages/meeting/MeetingMinutesPage";
import JiraTaskPage from "../pages/meeting/JiraTaskPage";

const router = createBrowserRouter([
  // 인증 없는 페이지
  { path: "/login", element: <LoginPage /> },
  { path: "/change-password", element: <ChangePasswordPage /> },
  { path: "/projects", element: <ProjectSelectPage /> },
  { path: "/projects/create", element: <ProjectCreatePage /> },

  // 사이드바 있는 레이아웃
  {
    element: <Layout />,
    children: [
      { path: "/", element: <Navigate to="/dashboard" replace /> },
      { path: "/dashboard", element: <MeetingListPage /> },
      { path: "/meeting", element: <MeetingListPage /> },
      { path: "/meeting/create", element: <MeetingCreatePage /> },
      { path: "/meeting/:id", element: <MeetingDetailPage /> },
      { path: "/meeting/:id/minutes", element: <MeetingMinutesPage /> },
      { path: "/meeting/:id/jira", element: <JiraTaskPage /> },
      { path: "/documents", element: <MeetingListPage /> },
      { path: "/members", element: <MeetingListPage /> },
    ],
  },
]);

export default router;
