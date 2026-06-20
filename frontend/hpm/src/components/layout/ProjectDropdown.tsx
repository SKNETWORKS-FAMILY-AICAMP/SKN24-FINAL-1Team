import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/meeting";
import * as DESIGN from "../../constants/design";
import file from "../../assets/sidebar/file.png";
import arrow from "../../assets/sidebar/arrow.png";
import plus from "../../assets/sidebar/plus.png";

interface Project {
  project_id: number;
  project_name: string;
}

interface ProjectDropdownProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
}

export default function ProjectDropdown({ isCollapsed, toggleCollapse }: ProjectDropdownProps) {
  const navigate = useNavigate();
  const { projectId, selectProject, user } = useAuth();
  const [projectOpen, setProjectOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    api.get("/projects/")
      .then(res => setProjects(res.data))
      .catch(() => {});
  }, [user?.users_id]);

  // Collapsed View
  if (isCollapsed) {
    return (
      <button
        onClick={toggleCollapse}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title="프로젝트 목록"
        className={`w-10 h-10 mx-auto flex justify-center items-center rounded-lg transition ${DESIGN.COLORS.white} bg-transparent ${DESIGN.BACKGROUND_COLORS.purpleHoverState}`}
      >
        <span>
          {isHovered ? (
            <img src={arrow} alt="" className="rotate-90" />
          ) : (
            <img src={file} alt="" />
          )}
        </span>
      </button>
    );
  }

  // Expanded View
  return (
    <>
      <button
        onClick={() => setProjectOpen(v => !v)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`flex items-center justify-between w-full ${DESIGN.PADDING_SIZES.sm} ${DESIGN.RADIUS_SIZES.md} ${DESIGN.FONT_SIZES.lg} transition ${DESIGN.COLORS.white} ${
          projectOpen
            ? DESIGN.BACKGROUND_COLORS.purpleHover
            : `bg-transparent ${DESIGN.BACKGROUND_COLORS.purpleHoverState}`
        }`}
      >
        <div className={`flex items-center ${DESIGN.GAP_SIZES.sm}`}>
          <span>
            {projectOpen || isHovered ? (
              <img
                src={arrow}
                alt=""
                className={`transition-transform duration-200 ${
                  projectOpen ? "rotate-180" : "rotate-90"
                }`}
              />
            ) : (
              <img src={file} alt="" className="" />
            )}
          </span>
          <span>프로젝트 목록</span>
        </div>
        <div className="flex items-center">
          <span
            onClick={e => {
              e.stopPropagation();
              navigate("/projects/create");
            }}
            title="프로젝트 추가"
            className="flex items-center justify-center transition"
          >
            <img src={plus} alt="추가" className="" />
          </span>
        </div>
      </button>

      {projectOpen && (
        <div className="flex flex-col">
          {projects.slice(0, 4).map(p => (
            <button
              key={p.project_id}
              onClick={() => {
                selectProject(p.project_id, p.project_name);
                navigate("/dashboard");
              }}
              className={`text-left px-3 py-1.5 ${DESIGN.RADIUS_SIZES.md} ${
                DESIGN.FONT_SIZES.md
              } transition ${DESIGN.COLORS.white} ${
                projectId === p.project_id
                  ? `${DESIGN.BACKGROUND_COLORS.purpleHover}`
                  : "bg-transparent hover:bg-white/5"
              }`}
            >
              {p.project_name}
            </button>
          ))}
          <button
            onClick={() => navigate("/projects")}
            className={`text-left px-3 py-[10px] ${DESIGN.FONT_SIZES.md} transition hover:underline ${DESIGN.COLORS.purpleLight}`}
          >
            전체보기 &rsaquo;
          </button>
        </div>
      )}
    </>
  );
}
