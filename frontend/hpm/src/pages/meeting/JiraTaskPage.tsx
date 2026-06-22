import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getTaskList, registerJiraTasks, type Task } from "../../services/meeting";

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
    <div className="mx-auto max-w-[960px] p-8">
      <div className="mb-8 flex items-center gap-3">
        {stepLabels.map((label, index) => (
          <div
            key={label}
            className={`rounded-full px-4 py-2 text-sm ${
              index === 1 ? "bg-[#623FB5] text-white" : "bg-[#F4F5F8] text-[#969696]"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[24px] font-semibold text-[#141414]">Jira 태스크 등록</h1>
        <button
          type="button"
          disabled={selected.length === 0 || registering}
          onClick={handleRegister}
          className="rounded-[8px] bg-[#623FB5] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#969696]"
        >
          {registering ? "등록 중..." : `선택 등록 (${selected.length})`}
        </button>
      </div>

      {loading ? (
        <div className="rounded-[12px] bg-[#F4F5F8] p-8 text-center text-sm text-[#969696]">
          태스크를 불러오는 중입니다.
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-[12px] bg-[#F4F5F8] p-8 text-center text-sm text-[#969696]">
          등록할 태스크가 없습니다.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((task) => {
            const isRegistered = registered.includes(task.meeting_task_id) || task.is_jira_synced;
            const isSelected = selected.includes(task.meeting_task_id);

            return (
              <button
                key={task.meeting_task_id}
                type="button"
                disabled={isRegistered}
                onClick={() => toggle(task.meeting_task_id)}
                className={`rounded-[12px] border p-4 text-left transition ${
                  isSelected
                    ? "border-[#623FB5] bg-[#F4F1FF]"
                    : "border-[#E6E1E6] bg-white hover:border-[#623FB5]"
                } ${isRegistered ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#141414]">{task.title}</p>
                    <p className="mt-1 text-xs text-[#969696]">
                      담당자 {task.owner || "미정"} · 마감 {task.due_date || "미정"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                      PRIORITY_COLOR[task.priority] || "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {PRIORITY_LABEL[task.priority] || task.priority || "중간"}
                  </span>
                </div>
                {isRegistered ? (
                  <p className="mt-2 text-xs text-[#623FB5]">이미 Jira에 등록되었습니다.</p>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
