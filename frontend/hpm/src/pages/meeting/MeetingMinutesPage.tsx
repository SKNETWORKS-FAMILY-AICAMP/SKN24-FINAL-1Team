import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getMeetingDetail,
  getTaskList,
  updateTask,
  approveMinutes,
  rejectMinutes,
  requestMinutesApproval,
  type Meeting,
  type Task,
} from "../../services/meeting";
import warningIcon from "../../assets/table/warning2.png";
import StepBar from "../../components/meeting/StepBar";

const PRIORITY_LABEL: Record<string, string> = {
  Highest: "매우 높음", High: "높음", Medium: "중간", Low: "낮음", Lowest: "매우 낮음",
};

const PRIORITY_BG: Record<string, string> = {
  Highest: "bg-red-600 text-white",
  High: "bg-indigo-600 text-white",
  Medium: "bg-indigo-400 text-white",
  Low: "bg-blue-100 text-blue-600",
  Lowest: "bg-gray-100 text-gray-500",
};

export default function MeetingMinutesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const meetingId = Number(id);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const [collapsedTasks, setCollapsedTasks] = useState<Set<number>>(new Set());
  const [openPriorityDropdown, setOpenPriorityDropdown] = useState<number | null>(null);
  const [openAssigneeDropdown, setOpenAssigneeDropdown] = useState<number | null>(null);
  const [requested, setRequested] = useState(false);

  const toggleCollapse = (taskId: number) => {
    setCollapsedTasks(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([getMeetingDetail(meetingId), getTaskList(meetingId)])
      .then(([m, t]) => {
        if (m) setMeeting(m);
        if (t) setTasks(t);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [meetingId]);

  if (loading) return <div className="p-8 text-gray-400">불러오는 중...</div>;
  if (!meeting) return <div className="p-8 text-gray-400">회의를 찾을 수 없습니다.</div>;

  const minutesStatus = meeting.minutes_status || "draft";

  const handleRequestApproval = async () => {
    setRequested(true);
    try {
      await requestMinutesApproval(meetingId);
    } catch {
      // 엔드포인트 오류는 무시하고 진행
    }
    navigate(`/meetings/${meetingId}/jira`);
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

  const handleTaskUpdate = async (task: Task, field: keyof Task, value: string) => {
    // 즉시 UI 반영 (optimistic update)
    setTasks(prev => prev.map(t =>
      t.meeting_task_id === task.meeting_task_id ? { ...t, [field]: value } : t
    ));
    try {
      await updateTask(meetingId, task.meeting_task_id, { [field]: value });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">

      <StepBar steps={["회의록 검토 & 태스크 수정", "Jira 태스크 등록", "요약 메일 발송"]} activeStep={1} />

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

      {/* 회의록 카드 */}
      <div className="bg-white rounded-xl border border-gray-200 mb-4">
        {/* 카드 헤더 */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">회의록</h2>
          <div className="flex gap-2">
            {minutesStatus === "draft" && (
              <button
                onClick={handleRequestApproval}
                disabled={requested}
                className="px-5 py-2 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-80"
                style={{ backgroundColor: requested ? "#623FB5" : "#4f46e5" }}
              >
                {requested ? "수정 요청 중..." : "수정 요청"}
              </button>
            )}
            {minutesStatus === "reviewing" && (
              <>
                <button
                  onClick={handleReject}
                  className="px-5 py-2 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600"
                >
                  거절
                </button>
                <button
                  onClick={handleApprove}
                  className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
                >
                  승인
                </button>
              </>
            )}
          </div>
        </div>

        {/* 회의 정보 테이블 */}
        <table className="w-full text-sm border-collapse border-t border-gray-100">
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="px-6 py-3 w-28 text-gray-500 whitespace-nowrap">회의 주제</td>
              <td className="px-4 py-3 text-gray-800" colSpan={3}>{meeting.title}</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="px-6 py-3 text-gray-500 whitespace-nowrap">회의 일시</td>
              <td className="px-4 py-3 text-gray-800">{meeting.meeting_at}</td>
              <td className="px-6 py-3 text-gray-500 whitespace-nowrap w-20 border-l border-gray-100">작성자</td>
              <td className="px-4 py-3 text-gray-800">
                {meeting.participants?.[0]?.name ?? "-"}
              </td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="px-6 py-3 text-gray-500 whitespace-nowrap">회의 장소</td>
              <td className="px-4 py-3 text-gray-800" colSpan={3}>{meeting.location || "미정"}</td>
            </tr>
            <tr>
              <td className="px-6 py-3 text-gray-500 whitespace-nowrap">참석자</td>
              <td className="px-4 py-3 text-gray-800" colSpan={3}>
                {meeting.participants?.map(p => p.name).join(", ")}
              </td>
            </tr>
          </tbody>
        </table>

        {/* 회의 내용 헤더 */}
        <div className="bg-gray-100 text-center py-2 text-sm font-semibold text-gray-700 border-t border-gray-200">
          회의 내용
        </div>

        {/* 회의 내용 본문 */}
        <div className="p-6">
          <textarea
            value={meeting.meeting_document || ""}
            onChange={e => setMeeting(m => m ? { ...m, meeting_document: e.target.value } : m)}
            className="w-full border border-gray-200 rounded-lg p-4 text-sm text-gray-700 leading-relaxed min-h-[120px] resize-y outline-none focus:border-indigo-400"
            placeholder="회의 내용이 없습니다."
          />
        </div>
      </div>

      {/* 업무 카드 */}
      <div className="bg-white rounded-xl border border-gray-200">
        {/* 업무 헤더 */}
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-200 rounded-t-xl">
          <span className="text-sm font-bold text-gray-800">업무</span>
          <span className="text-xs text-amber-600 flex items-center gap-1">
          <img src={warningIcon} alt="warning" className="w-4 h-4" />  업무는 Jira에 등록할 태스크입니다!</span>
        </div>

        {/* 컬럼 헤더 */}
        <div className="grid gap-2 px-4 py-2 border-b border-gray-100 text-xs text-gray-500 font-medium"
          style={{ gridTemplateColumns: "1fr auto auto auto" }}>
          <span className="pl-2">업무 명</span>
          <span className="w-36 text-center">담당자</span>
          <span className="w-32 text-center">기한</span>
          <span className="w-28 text-center">우선순위</span>
        </div>

        {/* 태스크 목록 */}
        <div className="divide-y divide-gray-100">
          {tasks.map(task => {
            const isCollapsed = collapsedTasks.has(task.meeting_task_id);
            const isPriorityOpen = openPriorityDropdown === task.meeting_task_id;
            return (
              <div key={task.meeting_task_id} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {/* 업무명 */}
                  <input
                    defaultValue={task.title}
                    onBlur={e => handleTaskUpdate(task, "title", e.target.value)}
                    className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-800 outline-none focus:border-indigo-400"
                    placeholder="업무명을 입력하세요"
                  />
                  {/* 잡기 버튼 */}
                  <button className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-1.5 whitespace-nowrap hover:bg-gray-50">
                    잡기 ▲
                  </button>
                  {/* 담당자 커스텀 드롭다운 */}
                  <div className="relative w-36">
                    <button
                      onClick={() => setOpenAssigneeDropdown(
                        openAssigneeDropdown === task.meeting_task_id ? null : task.meeting_task_id
                      )}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 text-left flex justify-between items-center hover:bg-gray-50"
                    >
                      <span className="truncate">{task.owner || "미배정"}</span>
                      <span className="text-xs text-gray-300 ml-1">▾</span>
                    </button>
                    {openAssigneeDropdown === task.meeting_task_id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenAssigneeDropdown(null)} />
                        <div className="absolute z-20 top-full mt-1 right-0 w-44 bg-white rounded-xl border border-gray-200 shadow-md py-2 overflow-hidden">
                          {meeting.participants?.map(p => (
                            <button
                              key={p.user_id}
                              onClick={() => {
                                handleTaskUpdate(task, "owner", p.name);
                                setOpenAssigneeDropdown(null);
                              }}
                              className={`w-full text-left px-4 py-2 text-sm transition
                                ${task.owner === p.name
                                  ? "bg-gray-50 text-gray-900 font-medium"
                                  : "text-gray-700 hover:bg-gray-50"}`}
                            >
                              {p.name}
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              handleTaskUpdate(task, "owner", "");
                              setOpenAssigneeDropdown(null);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:bg-gray-50"
                          >
                            미배정
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {/* 기한 */}
                  <input
                    type="date"
                    defaultValue={task.due_date || ""}
                    onBlur={e => handleTaskUpdate(task, "due_date", e.target.value)}
                    className="border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-700 outline-none w-32"
                  />
                  {/* 우선순위 커스텀 드롭다운 */}
                  <div className="relative w-28">
                    <button
                      onClick={() => setOpenPriorityDropdown(isPriorityOpen ? null : task.meeting_task_id)}
                      className="w-full border border-indigo-200 rounded-lg px-3 py-1.5 text-sm text-indigo-600 text-left flex justify-between items-center hover:bg-indigo-50"
                    >
                      <span>{PRIORITY_LABEL[task.priority] || task.priority}</span>
                      <span className="text-xs text-indigo-300">▾</span>
                    </button>
                    {isPriorityOpen && (
                      <>
                        {/* 닫기 오버레이 */}
                        <div className="fixed inset-0 z-10" onClick={() => setOpenPriorityDropdown(null)} />
                        {/* 드롭다운 목록 */}
                        <div className="absolute z-20 top-full mt-1 right-0 w-32 bg-white rounded-xl border-2 border-indigo-200 shadow-lg shadow-indigo-100 py-2 overflow-hidden">
                          {[
                            { value: "Highest", label: "매우 높음" },
                            { value: "High", label: "높음" },
                            { value: "Medium", label: "중간" },
                            { value: "Low", label: "낮음" },
                            { value: "Lowest", label: "매우 낮음" },
                          ].map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => {
                                handleTaskUpdate(task, "priority", opt.value);
                                setOpenPriorityDropdown(null);
                              }}
                              className={`w-full text-left px-3 py-2 text-sm transition
                                ${task.priority === opt.value
                                  ? "mx-1 w-[calc(100%-8px)] bg-indigo-100 text-indigo-600 font-medium rounded-lg"
                                  : "text-gray-700 hover:bg-gray-50"}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {/* 접기/펼치기 버튼 */}
                  {task.content && (
                    <button
                      onClick={() => toggleCollapse(task.meeting_task_id)}
                      className="text-xs font-medium whitespace-nowrap"
                      style={{ color: "#623FB5" }}
                    >
                      {isCollapsed ? "펼치기 ▼" : "접기 ▲"}
                    </button>
                  )}
                </div>
                {/* 메모 - 접기 상태일 때 숨김 */}
                {!isCollapsed && task.content && (
                  <div className="mt-2 text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded px-3 py-2">
                    {task.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="flex justify-between items-center mt-5">
        <button
          onClick={() => navigate(`/meetings`)}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
        >
          ← 회의 목록
        </button>
        {minutesStatus === "approved" && (
          <button
            onClick={() => navigate(`/meetings/${meetingId}/jira`)}
            className="px-5 py-2 text-white rounded-lg text-sm font-semibold"
            style={{ backgroundColor: "#623FB5" }}
          >
            Jira 등록 →
          </button>
        )}
      </div>
    </div>
  );
}
