import { Outlet, Navigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../../context/AuthContext";

export default function Layout() {
  const { user, projectId } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (!projectId) return <Navigate to="/projects" replace />;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-[200px] flex-1 bg-[#F5F5F5] min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
