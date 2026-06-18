import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTaskList, registerJiraTasks, type Task } from "../../features/meeting/api";

const PRIORITY_COLOR: Record<string, string> = {
  High: "bg-red-100 text-red-600",
  Medium: "bg-yellow-100 text-yellow-600",
  Low: "bg-blue-100 text-blue-600",
  Lowest: "bg-gray-100 text-gray-500",
};
const PRIORITY_LABEL: Record<string, string> = {
  High: "높음", Medium: "중간", Low: "낮음", Lowest: "최하",
};

export default function JiraTaskPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const meetingId = Number(id);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [registered, setRegistered] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    getTaskList(meetingId)
      .then(list => {
        setTasks(list);
        setSelected(list.map(t => t.meeting_task_id));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [meetingId]);

  const toggle = (taskId: number) => {
    if (registered.includes(taskId)) return;
    setSelected(prev => prev.includes(taskId) ? prev.filter(x => x !== taskId) : [...prev, taskId]);
  };

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const res = await registerJiraTasks(meetingId, selected);
      const registeredIds = res.registered.map(r => r.task_id);
      setRegistered(prev => [...prev, ...registeredIds]);
      setSelected([]);
      if (res.failed.length > 0) {
        alert(`일부 태스크 등록 실패: ${res.failed.length}건`);
      }
    } catch {
      alert("Jira 등록에 실패했습니다.");
    } finally {
      setRegistering(false);
    }
  };

  const stepLabels = ["회의록 검토 & 태스크 수정", "Jira 태스크 등록", "요약 메일 발송"];

  return (
    <div className="p-8">
      {/* Step bar */}
      <div className="flex items-start justify-center gap-0 mb-6">
        {stepLabels.map((label, i) => (
          <div key={i} className="flex flex-col items-center" style={{ minWidth: 140 }}>
            <div className="flex items-center w-full">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 z-10
                ${i < 1 ? "bg-[#F5A623] text-white" : i === 1 ? "bg-[#F5A623] text-white ring-2 ring-[#F5A623]/30" : "bg-gray-200 text-gray-400"}`}>
                {i < 1 ? "✓" : i + 1}
              </div>
              {i < stepLabels.length - 1 && <div className={`h-0.5 flex-1 ${i < 1 ? "bg-[#F5A623]" : "bg-gray-200"}`} />}
            </div>
            <span className={`text-xs mt-1.5 text-center ${i === 1 ? "text-[#F5A623] font-semibold" : "text-gray-400"}`}>{label}</span>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-full bg-[#0052CC] flex items-center justify-center text-white font-bold text-base">J</div>
          <h2 className="text-base font-bold text-gray-900">Jira 태스크 등록</h2>
        </div>

        <div className="flex items-center gap-3 mb-5">
          <span className="text-sm text-gray-400">Jira 프로젝트</span>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700">HPM</div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : tasks.length === 0 ? (
          <div className="py-12 text-center text-gray-300 text-sm">태스크가 없습니다.</div>
        ) : (
          <div className="flex flex-col gap-3 mb-6">
            {tasks.map(task => {
              const isRegistered = registered.includes(task.meeting_task_id) || task.is_jira_synced;
              const isSelected = selected.includes(task.meeting_task_id);
              return (
                <div
                  key={task.meeting_task_id}
                  onClick={() => toggle(task.meeting_task_id)}
                  className={`flex gap-3 p-4 rounded-xl border cursor-pointer transition
                    ${isRegistered ? "bg-green-50 border-green-100 cursor-default" : isSelected ? "bg-amber-50 border-amber-200" : "border-gray-100 hover:border-gray-200"}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected || !!isRegistered}
                    disabled={!!isRegistered}
                    onChange={() => toggle(task.meeting_task_id)}
                    className="w-4 h-4 mt-0.5 accent-[#F5A623] flex-shrink-0"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-gray-900 mb-2">{task.title}</p>
                    <div className="flex gap-2 flex-wrap items-center">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">담당: {task.owner}</span>
                      {task.due_date && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">기한: {task.due_date}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[task.priority] || "bg-gray-100 text-gray-500"}`}>
                        {PRIORITY_LABEL[task.priority] || task.priority}
                      </span>
                      {task.jira_key && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">{task.jira_key}</span>}
                    </div>
                  </div>
                  {isRegistered && (
                    <span className="flex-shrink-0 self-center text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
                      Jira 등록 완료
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-400">등록할 태스크를 선택하고 Jira에 등록해주세요.</span>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/meeting/${meetingId}/minutes`)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              이전
            </button>
            <button
              onClick={handleRegister}
              disabled={registering || selected.length === 0}
              className="px-5 py-2 bg-[#0052CC] text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed min-w-[90px]"
            >
              {registering ? "등록 중..." : "Jira 등록"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
