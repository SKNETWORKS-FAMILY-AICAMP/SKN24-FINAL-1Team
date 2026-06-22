import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getTaskList, registerJiraTasks, type Task } from "../../services/meeting";
import StepBar from "../../components/meeting/StepBar";

const PRIORITY_LABEL: Record<string, string> = {
  Highest: "매우 높음", High: "높음", Medium: "중간", Low: "낮음", Lowest: "매우 낮음",
};

const STEP_LABELS = ["회의록 검토 & 태스크 수정", "Jira 태스크 등록", "요약 메일 발송"];

const MOCK_TASKS: Task[] = [
  {
    meeting_task_id: 1,
    title: "사내 클라우드 보호처 신청 절차 및 예산 코드 확인",
    content: "",
    owner: "김규호",
    due_date: "2026-06-05",
    priority: "High",
    status: 0,
  },
  {
    meeting_task_id: 2,
    title: "운영 서버 외부 API 호출 보안 정책 확인",
    content: "",
    owner: "김규호",
    due_date: "2026-06-05",
    priority: "High",
    status: 0,
  },
  {
    meeting_task_id: 3,
    title: "업종 코드 자동 분류 기능 RFP 범위 검토",
    content: "",
    owner: "류지우",
    due_date: "2026-06-05",
    priority: "Medium",
    status: 0,
  },
  {
    meeting_task_id: 4,
    title: "파인튜닝 GPU 서버 확보 방안 검토",
    content: "",
    owner: "박수영",
    due_date: "2026-06-05",
    priority: "High",
    status: 0,
  },
];

export default function JiraTaskPage() {
  const { id } = useParams();
  const meetingId = Number(id);

  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [selected, setSelected] = useState<Set<number>>(
    new Set(MOCK_TASKS.map(t => t.meeting_task_id))
  );
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    getTaskList(meetingId)
      .then(list => {
        if (list && list.length > 0) {
          setTasks(list);
          setSelected(new Set(list.map(t => t.meeting_task_id)));
        }
      })
      .catch(console.error);
  }, [meetingId]);

  const toggle = (taskId: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  };

  const handleRegister = async () => {
    setRegistering(true);
    try {
      const taskIds = [...selected];
      await registerJiraTasks(meetingId, taskIds);
    } catch {
      // 등록 실패해도 다음 페이지로 진행
    } finally {
      setRegistering(false);
      navigate(`/meetings/${meetingId}/email`);
    }
  };

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
