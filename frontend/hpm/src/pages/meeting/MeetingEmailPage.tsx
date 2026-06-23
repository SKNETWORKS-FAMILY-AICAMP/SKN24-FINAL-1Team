import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getTaskList, type Task } from "../../services/meeting";
import StepBar from "../../components/meeting/StepBar";

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

export default function MeetingEmailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const meetingId = Number(id);

  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [selected, setSelected] = useState<Set<number>>(
    new Set(MOCK_TASKS.map(t => t.meeting_task_id))
  );
  const [sending, setSending] = useState(false);

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

  const handleSend = () => {
    setSending(true);
    setTimeout(() => {
      navigate("/meetings");
    }, 700);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <StepBar steps={STEP_LABELS} activeStep={3} />

      <h2 className="text-xl font-bold text-gray-900 mb-1">요약 메일 발송</h2>
      <p className="text-sm text-gray-400 mb-8">체크된 태스크 담당자에게 맞춤 메일이 발송됩니다.</p>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-col gap-3">
          {tasks.map(task => {
            const isSelected = selected.has(task.meeting_task_id);
            return (
              <button
                key={task.meeting_task_id}
                onClick={() => toggle(task.meeting_task_id)}
                className={`w-full text-left px-5 py-4 rounded-xl border transition-colors
                  ${isSelected
                    ? "bg-indigo-50 border-indigo-200"
                    : "bg-white border-gray-200 hover:bg-gray-50"}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold mb-0.5 ${isSelected ? "text-indigo-900" : "text-gray-900"}`}>
                      {task.owner || "미배정"}
                    </p>
                    <p className={`text-xs ${isSelected ? "text-indigo-500" : "text-gray-500"}`}>
                      담당 태스크: {task.title}{task.due_date ? ` (${task.due_date})` : ""}
                    </p>
                  </div>
                  <div
                    className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-colors
                      ${isSelected
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "border-gray-300 bg-white"}`}
                  >
                    {isSelected && (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end gap-3 mb-6">
        <button
          onClick={() => navigate(`/meetings/${meetingId}/jira`)}
          className="px-5 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          이전
        </button>
        <button
          onClick={handleSend}
          disabled={sending}
          className="px-5 py-2 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
          style={{ backgroundColor: "#623FB5" }}
        >
          {sending ? "발송 중..." : "메일 발송"}
        </button>
      </div>

      <div className="text-center">
        <button
          onClick={() => navigate("/meetings")}
          className="text-sm text-gray-400 underline hover:text-gray-600"
        >
          메일 발송을 건너뛰겠습니까? 메일 발송 없이 회의가 마무리 됩니다.
        </button>
      </div>
    </div>
  );
}
