import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../features/meeting/api";
import Header from "../../components/layout/Header";

interface Project {
  project_id: number;
  project_name: string;  // name → project_name
  description: string;
  meeting_count?: number;
  task_count?: number;
}

export default function ProjectSelectPage() {
  const navigate = useNavigate();

  const { user, selectProject, } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  if (!user) return;  // user 없으면 호출 안 함
  api.get("/projects/", { params: { user_id: user.users_id } })
    .then(res => setProjects(res.data))
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
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <Header />

      <div className="flex-1 p-10 pt-24">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">프로젝트</h1>
        <p className="text-sm text-gray-400 mb-8">회의를 생성할 프로젝트를 선택해주세요.</p>

        <p className="text-sm font-medium text-gray-500 mb-4">진행 중인 프로젝트</p>

        {loading ? (
          <div className="text-sm text-gray-400">불러오는 중...</div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {projects.map(p => (
              <div
                key={p.project_id}
                onClick={() => handleSelect(p)}
                className="bg-white rounded-xl p-6 cursor-pointer hover:shadow-md transition border border-gray-100 hover:border-[#F5A623]"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4 text-2xl">
                  🗺️
                </div>
                <p className="font-semibold text-gray-900 mb-1">{p.project_name}</p>
                <div className="flex gap-2 mt-3">
                  <span className="text-xs bg-red-100 text-red-500 px-3 py-1 rounded-full font-medium">
                    미해결 {p.task_count ?? 0}
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-medium">
                    전체 {p.meeting_count ?? 0}
                  </span>
                </div>
              </div>
            ))}

            {/* 새 프로젝트 추가 */}
            <div
              onClick={handleCreate}
              className="bg-white rounded-xl cursor-pointer hover:shadow-md transition border-2 border-dashed border-[#F5A623] flex items-center justify-center min-h-[160px]"
            >
              <span className="text-3xl text-[#F5A623]">+</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}