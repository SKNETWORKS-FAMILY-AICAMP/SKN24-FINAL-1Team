import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/sidebar/logo.png";
import dashboard from "../../assets/sidebar/dashboard.png";
import document from "../../assets/sidebar/document.png";
import member from "../../assets/sidebar/member.png";
import closeIcon from "../../assets/sidebar/close.png";
import hamburgerIcon from "../../assets/sidebar/hamburger.png";
import * as DESIGN from "../../constants/design";
import ProjectDropdown from "./ProjectDropdown";
import MeetingDropdown from "./MeetingDropdown";
import { useRecording } from "../../context/RecordingContext";

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

export default function Sidebar({ isCollapsed, toggleCollapse }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { meetingId: recMeetingId, startTime: recStartTime } = useRecording();

  const isActive = (path: string) => location.pathname.startsWith(path);

  // 미니 타이머 표시
  const isOnRecordingPage =
    recMeetingId !== null &&
    location.pathname === `/meetings/${recMeetingId}`;
  const showMiniTimer = recMeetingId !== null && !isOnRecordingPage;

  const [miniElapsed, setMiniElapsed] = useState(0);
  useEffect(() => {
    if (!showMiniTimer || recStartTime === null) {
      setMiniElapsed(0);
      return;
    }
    setMiniElapsed(Math.floor((Date.now() - recStartTime) / 1000));
    const interval = setInterval(() => {
      setMiniElapsed(Math.floor((Date.now() - recStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [showMiniTimer, recStartTime]);

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <aside
      className={`fixed left-0 top-0 h-screen ${
        isCollapsed ? "w-[54px]" : "w-[256px]"
      } ${DESIGN.BACKGROUND_COLORS.black} flex flex-col z-50 ${DESIGN.COLORS.white} transition-all duration-300`}
    >
      {/* 로고 및 상단 헤더 영역 */}
      {isCollapsed ? (
        <div className="flex justify-center items-center mt-[20px] mb-8">
          <button
            onClick={toggleCollapse}
            className="p-1 hover:bg-white/10 rounded transition"
          >
            <img src={hamburgerIcon} alt="열기" className="w-5" />
          </button>
        </div>
      ) : (
        <div className="relative flex flex-col items-center justify-center mt-[20px] mb-8">
          <img
            src={logo}
            alt="logo"
            className="cursor-pointer"
            onClick={() => navigate("/dashboard")}
          />
          <p onClick={() => navigate("/dashboard")} className={`${DESIGN.FONT_SIZES.sm} mt-1`}>회의피하지마</p>
          <button
            onClick={toggleCollapse}
            className="absolute top-1 right-3 p-1 hover:bg-white/10 rounded transition"
          >
            <img src={closeIcon} alt="닫기" className="w-5" />
          </button>
        </div>
      )}

      {/* 네비게이션 */}
      {!isCollapsed && (
        <nav
          className={`flex-1 flex flex-col py-3 px-[10px] overflow-y-auto ${DESIGN.GAP_SIZES.lg} transition-all duration-300`}
        >
          <ProjectDropdown isCollapsed={isCollapsed} toggleCollapse={toggleCollapse} />

          {/* 대시보드 */}
          <button
            onClick={() => navigate("/dashboard")}
            className={`flex items-center ${DESIGN.GAP_SIZES.sm} ${DESIGN.PADDING_SIZES.sm} ${DESIGN.RADIUS_SIZES.md} ${DESIGN.FONT_SIZES.lg} w-full text-left transition ${DESIGN.COLORS.white} ${
              isActive("/dashboard")
                ? `${DESIGN.BACKGROUND_COLORS.purple}`
                : `bg-transparent ${DESIGN.BACKGROUND_COLORS.purpleHoverState}`
            }`}
          >
            <span>
              <img src={dashboard} alt="" />
            </span>
            <span>대시보드</span>
          </button>

          <MeetingDropdown isCollapsed={isCollapsed} toggleCollapse={toggleCollapse} />

          {/* 문서 관리 */}
          <button
            onClick={() => navigate("/documents")}
            className={`flex items-center ${DESIGN.GAP_SIZES.sm} ${DESIGN.PADDING_SIZES.sm} ${DESIGN.RADIUS_SIZES.md} ${DESIGN.FONT_SIZES.lg} w-full text-left transition ${DESIGN.COLORS.white} ${
              isActive("/documents")
                ? `${DESIGN.BACKGROUND_COLORS.purple}`
                : `bg-transparent ${DESIGN.BACKGROUND_COLORS.purpleHoverState}`
            }`}
          >
            <span>
              <img src={document} alt="" />
            </span>
            <span>문서 관리</span>
          </button>

          {/* 구성원 관리 */}
          <button
            onClick={() => navigate("/members")}
            className={`flex items-center ${DESIGN.GAP_SIZES.sm} ${DESIGN.PADDING_SIZES.sm} ${DESIGN.RADIUS_SIZES.md} ${DESIGN.FONT_SIZES.lg} w-full text-left transition ${DESIGN.COLORS.white} ${
              isActive("/members")
                ? `${DESIGN.BACKGROUND_COLORS.purple}`
                : `bg-transparent ${DESIGN.BACKGROUND_COLORS.purpleHoverState}`
            }`}
          >
            <span>
              <img src={member} alt="" />
            </span>
            <span>구성원 관리</span>
          </button>
        </nav>
      )}
    </aside>
  );
}