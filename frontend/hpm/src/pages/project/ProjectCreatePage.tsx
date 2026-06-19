import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../features/meeting/api";
import Header from "../../components/layout/Header";

const STEPS = ["Jira 계정 연동", "Jira 프로젝트", "구성원 초대"];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-start justify-center gap-0 mb-10">
      {STEPS.map((label, i) => (
        <div key={i} className="flex flex-col items-center" style={{ minWidth: 160 }}>
          <div className="flex items-center w-full">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 z-10 transition-all
              ${i === current ? "bg-[#6B4EFF] text-white" : i < current ? "bg-gray-300 text-white" : "bg-gray-200 text-gray-400"}`}>
              {i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 ${i < current ? "bg-[#6B4EFF]" : "bg-gray-200"}`} />
            )}
          </div>
          <span className={`text-xs mt-2 text-center font-medium ${i === current ? "text-[#6B4EFF]" : "text-gray-400"}`}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

interface UserOption { users_id: number; name: string; work: string; }
interface JiraProject { key: string; name: string; }

export default function ProjectCreatePage() {
  const navigate = useNavigate();
  const { user, selectProject } = useAuth();
  const [step, setStep] = useState(0);

  const [jiraConnected, setJiraConnected] = useState(false);
  const [jiraProjects, setJiraProjects] = useState<JiraProject[]>([]);
  const [jiraLoading, setJiraLoading] = useState(false);
  const [selectedJiraProject, setSelectedJiraProject] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [members, setMembers] = useState<(UserOption & { isJira: boolean })[]>([]);
  const [searchName, setSearchName] = useState("");
  const [searchResult, setSearchResult] = useState<UserOption | null>(null);
  const [creating, setCreating] = useState(false);

  // jira=success 감지

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("jira") === "success") {
      setJiraConnected(true);
      setStep(1);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // 유저 목록 로드
  useEffect(() => {
    api.get("/users/").then(res => {
      setAllUsers(res.data);
      if (user) {
        const me = res.data.find((u: UserOption) => u.users_id === user.users_id);
        if (me) setMembers([{ ...me, isJira: true }]);
      }
    }).catch(() => {});
  }, [user]);

  // Jira 연동 완료 후 프로젝트 목록 로드
  useEffect(() => {
    if (!jiraConnected || !user) return;
    setJiraLoading(true);
    api.get(`/jira/projects/?user_id=${user.users_id}`)
      .then(res => setJiraProjects(res.data))
      .catch(() => alert("Jira 프로젝트 목록을 불러오지 못했습니다."))
      .finally(() => setJiraLoading(false));
  }, [jiraConnected, user]);

  const handleJiraConnect = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/jira/start/?user_id=${user?.users_id}`;
};

  const handleSearch = () => {
    const found = allUsers.find(u => u.name.includes(searchName));
    setSearchResult(found ?? null);
  };

  const handleAddMember = (u: UserOption) => {
    if (!members.find(m => m.users_id === u.users_id)) {
      setMembers(prev => [...prev, { ...u, isJira: false }]);
    }
    setSearchResult(null);
    setSearchName("");
  };

  const handleRemoveMember = (id: number) => {
    setMembers(prev => prev.filter(m => m.users_id !== id));
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await api.post("/projects/", {
        project_name: selectedJiraProject
          ? jiraProjects.find(p => p.key === selectedJiraProject)?.name ?? "새 프로젝트"
          : "새 프로젝트",
        description: "",
        owner_id: user?.users_id,
        member_ids: members.map(m => m.users_id),
      });
      selectProject(res.data.project_id, res.data.project_name);
      navigate("/projects");
    } catch (e) {
      console.error("프로젝트 생성 실패:", e);
      alert("프로젝트 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  };

  const visibleProjects = showAll ? jiraProjects : jiraProjects.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <Header />

      <div className="flex-1 flex items-center justify-center py-10 pt-24">
        <div className="bg-white rounded-2xl shadow-sm p-10 w-full max-w-2xl">
          <StepBar current={step} />

          {/* STEP 0 - Jira 계정 연동 */}
          {step === 0 && (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">팀의 개발 흐름을 한눈에</h2>
              <p className="text-sm text-gray-400 mb-10">Jira와 연동하면 프로젝트 현황을 바로 파악할 수 있어요.</p>

              <div className="flex items-center justify-center mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-[#0052CC] rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-2xl">J</span>
                  </div>
                  <span className="text-3xl font-bold text-[#0052CC]">Jira</span>
                </div>
              </div>

              {jiraConnected ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center gap-2 text-green-600 font-semibold">
                    <span className="text-xl">✅</span> Jira 연동 완료
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="px-8 py-3 bg-[#6B4EFF] text-white rounded-lg font-semibold hover:bg-[#5a3fee]"
                  >
                    다음
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={handleJiraConnect}
                    className="px-8 py-3 bg-[#6B4EFF] text-white rounded-lg font-semibold hover:bg-[#5a3fee]"
                  >
                    Jira와 연동하기
                  </button>
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm text-gray-400 hover:underline"
                  >
                    건너뛰기
                  </button>
                </div>
              )}
            </div>
          )}

          {/* STEP 1 - Jira 프로젝트 선택 */}
          {step === 1 && (
            <div>
              <p className="text-sm text-gray-500 mb-5">
                Jira에서 연동할 프로젝트를 선택해주세요. 선택한 프로젝트명이 서비스 프로젝트명으로 자동 설정됩니다.
              </p>

              {jiraLoading ? (
                <div className="text-sm text-gray-400 text-center py-10">Jira 프로젝트 불러오는 중...</div>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden mb-5">
                  {visibleProjects.map(p => (
                    <div
                      key={p.key}
                      onClick={() => setSelectedJiraProject(p.key)}
                      className={`flex items-center justify-between px-5 py-4 cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 transition
                        ${selectedJiraProject === p.key ? "bg-purple-50 border-l-4 border-l-[#6B4EFF]" : ""}`}
                    >
                      <span className={`text-sm font-medium ${selectedJiraProject === p.key ? "text-[#6B4EFF]" : "text-gray-700"}`}>
                        {p.name}
                      </span>
                      {selectedJiraProject === p.key && <span className="text-[#6B4EFF] text-lg">✓</span>}
                    </div>
                  ))}
                  {!showAll && jiraProjects.length > 3 && (
                    <button
                      onClick={() => setShowAll(true)}
                      className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1"
                    >
                      ▽ 더보기
                    </button>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button onClick={() => setStep(0)} className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">이전</button>
                <button
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 bg-[#6B4EFF] text-white rounded-lg text-sm font-semibold hover:bg-[#5a3fee]"
                >
                  선택 완료
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 - 구성원 초대 */}
          {step === 2 && (
            <div>
              <p className="text-sm text-gray-500 mb-5">
                Jira 멤버가 아닌 사용자도 추가할 수 있습니다. 단, 칸반보드 접근은 제한됩니다.
              </p>

              <div className="flex gap-3 mb-5">
                <input
                  value={searchName}
                  onChange={e => setSearchName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="이름을 입력하세요."
                  className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#6B4EFF]"
                />
                <button
                  onClick={handleSearch}
                  className="px-5 py-2.5 bg-[#6B4EFF] text-white rounded-lg text-sm font-semibold hover:bg-[#5a3fee]"
                >
                  검색
                </button>
                {searchResult && (
                  <div className="flex items-center justify-between border border-gray-200 rounded-lg px-4 py-2.5 min-w-[160px]">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{searchResult.name}</p>
                      <p className="text-xs text-gray-400">{searchResult.work}</p>
                    </div>
                    <button
                      onClick={() => handleAddMember(searchResult)}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200"
                    >+ 추가</button>
                  </div>
                )}
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden mb-5">
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">구성원</span>
                  <span className="w-5 h-5 bg-[#6B4EFF] text-white rounded-full text-xs flex items-center justify-center font-bold">
                    {members.length}
                  </span>
                </div>
                {members.map(m => (
                  <div key={m.users_id} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{m.name}</p>
                      <p className="text-xs text-gray-400">{m.work}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.isJira ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>
                        {m.isJira ? "Jira 구성원" : "추가됨"}
                      </span>
                      <button
                        onClick={() => handleRemoveMember(m.users_id)}
                        className="text-gray-300 hover:text-red-400 text-lg leading-none"
                      >×</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button onClick={() => setStep(1)} className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">이전</button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="px-5 py-2.5 bg-[#6B4EFF] text-white rounded-lg text-sm font-semibold hover:bg-[#5a3fee] disabled:opacity-60"
                >
                  {creating ? "생성 중..." : "프로젝트 생성"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}