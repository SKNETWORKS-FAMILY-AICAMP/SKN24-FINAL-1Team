import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/meeting";
import ProjectCard from "../../components/project/ProjectCard";
import ProjectAdd from "../../components/project/ProjectAdd";
import * as DESIGN from "../../constants/design";

interface Project {
  project_id: number;
  project_name: string;
  startDate: string;
  members?: string[];
}

export default function ProjectSelectPage() {
  const navigate = useNavigate();
  const { user, selectProject } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    api.get("/projects/", {
      params: {
        user_id: user.users_id,
      },
    })
      .then((res) => {
        console.log("프로젝트 API 응답:", res.data);
        setProjects(res.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);
  const handleSelect = (p: Project) => {
    selectProject(p.project_id, p.project_name);
    navigate("/dashboard");
  };

  const handleCreate = () => {
    navigate("/projects/create");
  };

  return (
    <div className={`min-h-screen ${DESIGN.BACKGROUND_COLORS.white} flex flex-col w-full`}>

      <div className="flex-1 p-10 pt-24 max-w-[1504px] mx-auto w-full">
        <h1 className={`${DESIGN.FONT_SIZES.h2} ${DESIGN.MARGIN_BOTTOM_SIZES.sm}`}>프로젝트</h1>
        <p className={`${DESIGN.FONT_SIZES.lg} ${DESIGN.MARGIN_BOTTOM_SIZES["3xl"]} ${DESIGN.COLORS.gray}`}>회의를 생성할 프로젝트를 선택해주세요.</p>
        {loading ? (
          <div className="text-sm text-gray-400">불러오는 중...</div>
        ) : (
          <div className={`flex flex-wrap ${DESIGN.GAP_SIZES["4xl"]} justify-start`}>
          {projects.map(p => (
            <ProjectCard 
              key={p.project_id}
              project={p} 
              onClick={() => handleSelect(p)} 
            />
          ))}
            <ProjectAdd onClick={handleCreate} />
          </div>
        )}
      </div>
    </div>
  );
}
