import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../features/meeting/api";

interface RecentMeeting {
  meeting_id: number;
  title: string;
  status: string;
}

interface Project {
  project_id: number;
  project_name: string;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, projectId, projectName, selectProject, logout } = useAuth();

  const [projectOpen, setProjectOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<RecentMeeting[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState<{ id: number; content: string; is_read: boolean; created_at: string }[]>([]);

  useEffect(() => {
    api.get("/projects/").then(res => setProjects(res.data)).catch(() => {});
    if (projectId) {
      api.get(`/meetings/?project_id=${projectId}`).then(res => {
        setRecentMeetings(res.data.slice(0, 4));
      }).catch(() => {});
    }
    if (user?.users_id) {
      api.get(`/notifications/?user_id=${user.users_id}`).then(res => setNotifications(res.data)).catch(() => {});
    }
  }, [projectId]);

  const unread = notifications.filter(n => !n.is_read).length;

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleNotifClick = async (id: number) => {
    await api.patch(`/notifications/${id}/read/`).catch(() => {});
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  return (
    <aside className="fixed left-0 top-0 h-screen w-[200px] bg-[#1A1A2E] flex flex-col z-50">
      {/* 로고 */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate("/projects")}
        >
          <div className="w-8 h-8 rounded-lg bg-[#F5A623] flex items-center justify-center text-white font-bold text-sm">H</div>
          <div>
            <p className="text-white font-bold text-sm leading-none">HPM</p>
            <p className="text-gray-400 text-[10px]">회의피하지마</p>
          </div>
        </div>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 flex flex-col py-3 px-2 overflow-y-auto gap-0.5">

        {/* 프로젝트 목록 드롭다운 */}
        <button
          onClick={() => setProjectOpen(v => !v)}
          className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition"
        >
          <div className="flex items-center gap-2">
            <span>📁</span>
            <span>프로젝트 목록</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="text-gray-500 hover:text-white text-xs px-1"
              onClick={e => { e.stopPropagation(); navigate("/projects/create"); }}
              title="프로젝트 추가"
            >+</span>
            <span className="text-xs">{projectOpen ? "▲" : "▼"}</span>
          </div>
        </button>

        {projectOpen && (
          <div className="ml-4 flex flex-col gap-0.5 mb-1">
            {projects.map(p => (
              <button
                key={p.project_id}
                onClick={() => { selectProject(p.project_id, p.project_name); navigate("/dashboard"); }}
                className={`text-left px-3 py-1.5 rounded-lg text-xs transition
                  ${projectId === p.project_id ? "text-[#F5A623] bg-[#F5A623]/10" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
              >
                {p.project_name}
              </button>
            ))}
          </div>
        )}

        {/* 대시보드 */}
        <button
          onClick={() => navigate("/dashboard")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full text-left transition
            ${isActive("/dashboard") ? "bg-[#F5A623]/20 text-[#F5A623] font-semibold" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
        >
          <span>📊</span>
          <span>대시보드</span>
        </button>

        {/* 회의 목록 드롭다운 */}
        <button
          onClick={() => setMeetingOpen(v => !v)}
          className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition
            ${isActive("/meeting") ? "bg-[#F5A623]/20 text-[#F5A623] font-semibold" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
        >
          <div className="flex items-center gap-2">
            <span>🗓️</span>
            <span>회의 목록</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="text-gray-500 hover:text-white text-xs px-1"
              onClick={e => { e.stopPropagation(); navigate("/meeting/create"); }}
              title="회의 추가"
            >+</span>
            <span className="text-xs">{meetingOpen ? "▲" : "▼"}</span>
          </div>
        </button>

        {meetingOpen && (
          <div className="ml-4 flex flex-col gap-0.5 mb-1">
            <p className="text-[10px] text-gray-600 px-3 py-1">최신순</p>
            {recentMeetings.map(m => (
              <button
                key={m.meeting_id}
                onClick={() => navigate(`/meeting/${m.meeting_id}`)}
                className="flex items-center justify-between text-left px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition group"
              >
                <span className="truncate max-w-[110px]">{m.title}</span>
                <span className="opacity-0 group-hover:opacity-100 text-gray-500">⋮</span>
              </button>
            ))}
            <button
              onClick={() => navigate("/meeting")}
              className="text-left px-3 py-1.5 text-xs text-[#F5A623] hover:underline"
            >
              전체보기 &rsaquo;
            </button>
          </div>
        )}

        {/* 문서 관리 */}
        <button
          onClick={() => navigate("/documents")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full text-left transition
            ${isActive("/documents") ? "bg-[#F5A623]/20 text-[#F5A623] font-semibold" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
        >
          <span>📄</span>
          <span>문서 관리</span>
        </button>

        {/* 구성원 관리 */}
        <button
          onClick={() => navigate("/members")}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm w-full text-left transition
            ${isActive("/members") ? "bg-[#F5A623]/20 text-[#F5A623] font-semibold" : "text-gray-400 hover:text-white hover:bg-white/5"}`}
        >
          <span>👥</span>
          <span>구성원 관리</span>
        </button>
      </nav>

      {/* 하단 알림 + 아바타 */}
      <div className="px-4 py-4 border-t border-white/10 flex items-center justify-between">
        <div className="relative">
          <button
            onClick={() => setShowNotif(v => !v)}
            className="text-gray-400 hover:text-white text-xl relative"
          >
            🔔
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-bold">
                {unread}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute bottom-10 left-0 w-72 bg-white rounded-xl shadow-xl overflow-hidden border z-50">
              <div className="px-4 py-3 font-semibold text-sm border-b flex justify-between">
                <span>알림</span>
                <button onClick={() => setShowNotif(false)} className="text-gray-400">×</button>
              </div>
              {notifications.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-400 text-sm">알림이 없습니다.</div>
              ) : (
                notifications.slice(0, 10).map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleNotifClick(n.id)}
                    className={`px-4 py-3 cursor-pointer border-b text-sm hover:bg-gray-50 ${n.is_read ? "opacity-50" : ""}`}
                  >
                    <p className="text-gray-800">{n.content}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(n.created_at).toLocaleString("ko-KR")}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div
          className="w-8 h-8 rounded-full bg-[#F5A623] flex items-center justify-center text-white font-bold text-sm cursor-pointer"
          onClick={logout}
          title="로그아웃"
        >
          {user?.name?.[0] ?? "U"}
        </div>
      </div>
    </aside>
  );
}
