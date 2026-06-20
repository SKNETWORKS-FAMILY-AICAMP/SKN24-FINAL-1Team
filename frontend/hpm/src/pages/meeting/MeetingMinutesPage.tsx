import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getMeetingDetail,
  getTaskList,
  updateTask,
  requestMinutesApproval,
  approveMinutes,
  rejectMinutes,
  type Meeting,
  type Task,
} from "../../services/meeting";

type Tab = "minutes" | "tasks" | "chat";

const PRIORITY_COLOR: Record<string, string> = {
  High: "bg-red-100 text-red-600",
  Medium: "bg-yellow-100 text-yellow-600",
  Low: "bg-blue-100 text-blue-600",
  Lowest: "bg-gray-100 text-gray-500",
};

const PRIORITY_LABEL: Record<string, string> = {
  High: "높음", Medium: "중간", Low: "낮음", Lowest: "최하",
};

export default function MeetingMinutesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const meetingId = Number(id);

  const [meeting, setMeeting] = useState<Meeting | null>({
    meeting_id: meetingId,
    title: "2025 Q3 제품 로드맵 검토",
    location: "3층 대회의실",
    meeting_at: "2025-06-10T14:00:00",
    status: "finished",
    minutes_status: "draft",
    meeting_document: `1. 상반기 채용 진행 상황 공유
- 지원자 총 130명 중 백엔드 지원자가 가장 높은 비율 차지.
- 협업 경험 부족자가 다수 관찰되므로 최종 면접에서 추가 검증 필요.

2. 신규 입사자 온보딩 현황 공유
- 기존 가이드 문서가 불명확하여 혼란스럽다는 의견 수렴.
- 협업 툴(슬랙, 지라, 노션) 상세 사용 가이드라인과 사내 FAQ 보강 예정.

3. 조직 개편 현황 공유
- 개발팀 조직을 기능(Data/Service) 중심으로 변경 논의 중.
- 불필요한 회의 단축을 위한 회의 규칙 제정 예정.

4. 직원 만족도 조사 결과 공유
- 유연근무 시간 확대 및 복지비 사용처 다양화 요구가 높음.
- 개선안 실현 가능 여부 파악 예정.`,
    is_meeting: true,
    project: 1,
    participants: [
      { user_id: 1, name: "김민준(팀장)" },
      { user_id: 2, name: "김지원" },
      { user_id: 3, name: "김규호" },
      { user_id: 4, name: "류지우" }
    ]
  });
  const [tasks, setTasks] = useState<Task[]>([
    {
      meeting_task_id: 1,
      meeting_id: meetingId,
      title: "백엔드 최종 오프라인 면접 문항 개발 및 프로세스 정리",
      owner: "김민준(팀장)",
      due_date: "2025-06-17",
      priority: "High",
      jira_key: ""
    },
    {
      meeting_task_id: 2,
      meeting_id: meetingId,
      title: "협업 툴 사용 매뉴얼 보강 및 사내 FAQ 문서 제작",
      owner: "류지우",
      due_date: "2025-06-20",
      priority: "Medium",
      jira_key: ""
    },
    {
      meeting_task_id: 3,
      meeting_id: meetingId,
      title: "데이터팀/서비스팀 구조 개편안 확정 및 공표",
      owner: "김지원",
      due_date: "2025-06-25",
      priority: "Medium",
      jira_key: ""
    },
    {
      meeting_task_id: 4,
      meeting_id: meetingId,
      title: "유연근무제 확대 운영지침 초안 마련",
      owner: "김규호",
      due_date: "2025-06-22",
      priority: "Low",
      jira_key: ""
    }
  ]);
  const [tab, setTab] = useState<Tab>("minutes");
  const [viewAs, setViewAs] = useState<"member" | "creator">("member");

  useEffect(() => {
    Promise.all([getMeetingDetail(meetingId), getTaskList(meetingId)])
      .then(([m, t]) => {
        if (m && m.title) setMeeting(m);
        if (t && t.length > 0) setTasks(t);
      })
      .catch(console.error);
  }, [meetingId]);

  if (!meeting) return <div className="p-8 text-gray-400">회의를 찾을 수 없습니다.</div>;

  const minutesStatus = meeting.minutes_status || "draft";

  const handleRequestApproval = async () => {
    try {
      await requestMinutesApproval(meetingId);
      setMeeting(m => m ? { ...m, minutes_status: "reviewing" } : m);
    } catch { alert("승인 요청에 실패했습니다."); }
  };

  const handleApprove = async () => {
    try {
      await approveMinutes(meetingId);
      setMeeting(m => m ? { ...m, minutes_status: "approved" } : m);
      setTimeout(() => navigate(`/meetings/${meetingId}/jira`), 1200);
    } catch { alert("승인에 실패했습니다."); }
  };

  const handleReject = async () => {
    try {
      await rejectMinutes(meetingId);
      setMeeting(m => m ? { ...m, minutes_status: "rejected" } : m);
    } catch { alert("거절에 실패했습니다."); }
  };

  const handleReEdit = () => {
    setMeeting(m => m ? { ...m, minutes_status: "draft" } : m);
  };

  const handleTaskUpdate = async (task: Task, field: keyof Task, value: string) => {
    try {
      const updated = await updateTask(meetingId, task.meeting_task_id, { [field]: value });
      setTasks(prev => prev.map(t => t.meeting_task_id === task.meeting_task_id ? updated : t));
    } catch (e) { console.error(e); }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "minutes", label: "📝 회의록" },
    { key: "tasks", label: "✅ 태스크" },
    { key: "chat", label: "💬 챗봇 내역" },
  ];

  const stepLabels = ["회의록 검토 & 태스크 수정", "Jira 태스크 등록", "요약 메일 발송"];

  return (
    <div className="p-8">
      {/* Step bar */}
      <div className="flex items-start justify-center gap-0 mb-6">
        {stepLabels.map((label, i) => (
          <div key={i} className="flex flex-col items-center" style={{ minWidth: 140 }}>
            <div className="flex items-center w-full">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 z-10
                ${i === 0 ? "bg-[#F5A623] text-white" : "bg-gray-200 text-gray-400"}`}>
                {i === 0 ? "✓" : i + 1}
              </div>
              {i < stepLabels.length - 1 && <div className="h-0.5 flex-1 bg-gray-200" />}
            </div>
            <span className={`text-xs mt-1.5 text-center ${i === 0 ? "text-[#F5A623] font-semibold" : "text-gray-400"}`}>{label}</span>
          </div>
        ))}
      </div>

      {/* 역할 전환 */}
      <div className="flex items-center gap-2 mb-4 bg-white border border-dashed border-gray-200 rounded-lg px-4 py-2 w-fit">
        <span className="text-xs text-gray-400">데모 역할:</span>
        {(["member", "creator"] as const).map(r => (
          <button
            key={r}
            onClick={() => setViewAs(r)}
            className={`text-xs px-3 py-1 rounded-full border transition ${viewAs === r ? "bg-[#1A1A2E] text-white border-[#1A1A2E]" : "border-gray-200 text-gray-500"}`}
          >
            {r === "member" ? "구성원" : "프로젝트 생성자"}
          </button>
        ))}
      </div>

      {/* 상태 배너 */}
      {minutesStatus === "reviewing" && (
        <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium text-amber-800">
          ⏳ 프로젝트 생성자의 승인을 기다리고 있습니다.
        </div>
      )}
      {minutesStatus === "approved" && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm font-medium text-green-800">
          ✅ 회의록이 승인되었습니다. Jira 태스크 등록 페이지로 이동합니다...
        </div>
      )}
      {minutesStatus === "rejected" && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm font-medium text-red-700">
          ❌ 승인이 거절되었습니다. 회의록을 수정한 후 재요청해 주세요.
        </div>
      )}

      {/* 탭 */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 w-fit shadow-sm">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t.key ? "bg-[#1A1A2E] text-white" : "text-gray-500 hover:text-gray-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 회의록 탭 */}
      {tab === "minutes" && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-4">회의록</h2>
          <table className="text-sm mb-5 w-full">
            <tbody>
              {[
                ["날짜 및 시간", meeting.meeting_at],
                ["참석자", meeting.participants?.map(p => p.name).join(", ")],
                ["장소", meeting.location || "미정"],
                ["회의 주제", meeting.title],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td className="text-gray-400 pr-6 pb-2 w-24 whitespace-nowrap">{k}</td>
                  <td className="pb-2 text-gray-700">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {meeting.meeting_document && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2 border-b border-gray-100 pb-1">회의 내용 요약</p>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                {meeting.meeting_document}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 태스크 탭 */}
      {tab === "tasks" && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-2">추출된 태스크</h2>
          <p className="text-sm text-gray-400 mb-5">내용, 담당자, 기한을 수정할 수 있습니다.</p>
          {tasks.length === 0 ? (
            <div className="text-center text-gray-300 py-12">태스크가 없습니다.</div>
          ) : (
            tasks.map(task => (
              <div key={task.meeting_task_id} className="flex gap-4 py-4 border-b border-gray-50 last:border-0">
                <div className="flex-1">
                  <input
                    defaultValue={task.title}
                    onBlur={e => handleTaskUpdate(task, "title", e.target.value)}
                    disabled={minutesStatus === "reviewing" || minutesStatus === "approved"}
                    className="font-medium text-sm text-gray-900 mb-2 w-full bg-transparent outline-none border-b border-transparent focus:border-[#F5A623] disabled:cursor-default"
                  />
                  <div className="flex gap-3 items-center flex-wrap mt-2">
                    <input
                      defaultValue={task.owner}
                      onBlur={e => handleTaskUpdate(task, "owner", e.target.value)}
                      disabled={minutesStatus === "reviewing" || minutesStatus === "approved"}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full w-24 outline-none disabled:cursor-default"
                      placeholder="담당자"
                    />
                    <input
                      type="date"
                      defaultValue={task.due_date || ""}
                      onBlur={e => handleTaskUpdate(task, "due_date", e.target.value)}
                      disabled={minutesStatus === "reviewing" || minutesStatus === "approved"}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full outline-none disabled:cursor-default"
                    />
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[task.priority] || "bg-gray-100 text-gray-500"}`}>
                      {PRIORITY_LABEL[task.priority] || task.priority}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 챗봇 내역 탭 */}
      {tab === "chat" && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900 mb-2">챗봇 질의·답변 내역</h2>
          <div className="text-center text-gray-300 py-12">
            <p className="text-2xl mb-2">💬</p>
            <p className="text-sm">회의 중 챗봇 질의 내역이 없습니다.</p>
          </div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex justify-between items-center mt-5">
        <button onClick={() => navigate(`/meetings/${meetingId}`)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
          ← 회의 상세
        </button>
        <div className="flex gap-2">
          {viewAs === "member" && minutesStatus === "draft" && (
            <button onClick={handleRequestApproval} className="px-5 py-2 bg-[#F5A623] text-white rounded-lg text-sm font-semibold hover:bg-[#e8951a]">
              승인 요청
            </button>
          )}
          {viewAs === "member" && minutesStatus === "reviewing" && (
            <button disabled className="px-5 py-2 bg-gray-200 text-gray-400 rounded-lg text-sm font-semibold cursor-not-allowed">
              검토 중...
            </button>
          )}
          {viewAs === "member" && minutesStatus === "rejected" && (
            <button onClick={handleReEdit} className="px-5 py-2 bg-[#1A1A2E] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a4e]">
              회의록 재수정
            </button>
          )}
          {viewAs === "creator" && minutesStatus === "reviewing" && (
            <>
              <button onClick={handleReject} className="px-5 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600">
                거절
              </button>
              <button onClick={handleApprove} className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700">
                승인
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
