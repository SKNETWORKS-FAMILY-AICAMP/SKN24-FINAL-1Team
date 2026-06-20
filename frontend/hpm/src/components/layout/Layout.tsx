import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import * as DESIGN from "../../constants/design";

export default function Layout() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const noLayoutPaths = ["/login", "/change-password", "/projects", "/projects/create"];
  const isNoLayout = noLayoutPaths.includes(location.pathname);

  if (isNoLayout) {
      const isProjectPage = location.pathname.startsWith("/projects");
      return (
        <div className="w-full min-h-screen bg-[#F6F5FA] flex flex-col">
          {isProjectPage && <Header />}
          <div className="flex-1">
            <Outlet />
          </div>
        </div>
      );
    }

    return (
      <div className={`flex h-screen w-screen overflow-hidden ${DESIGN.BACKGROUND_COLORS.white}`}>
        <Sidebar isCollapsed={isCollapsed} toggleCollapse={() => setIsCollapsed(v => !v)} />
        <div className={`${isCollapsed ? "ml-[54px]" : "ml-[256px]"} flex flex-1 flex-col h-full min-w-0 transition-all duration-300`}>
          <Header />
          <main className={`flex-1 h-full overflow-y-auto ${DESIGN.BACKGROUND_COLORS.white} p-6 text-gray-950`}>
            <div className="max-w-[1504px] mx-auto w-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
  );
}