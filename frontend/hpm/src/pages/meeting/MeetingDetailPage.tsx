import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getMeetingDetail,
  startMeeting,
  endMeeting,
  sendChatMessage,
  type Meeting,
} from "../../features/meeting/api";

type ChatMsg = { role: "user" | "bot"; content: string; source?: string };

export default function MeetingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const meetingId = Number(id);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [chatFilter, setChatFilter] = useState("전체");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [endLoading, setEndLoading] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    getMeetingDetail(meetingId)
      .then(setMeeting)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [meetingId]);

  useEffect(() => {
    if (meeting?.status === "in_progress") {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [meeting?.status]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  if (loading) return <div className="p-8 text-gray-400">불러오는 중...</div>;
  if (!meeting) return <div className="p-8 text-gray-400">회의를 찾을 수 없습니다.</div>;

  const fmt = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const handleStart = async () => {
    try {
      await startMeeting(meetingId);
      // 녹음 시작
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = e => chunksRef.current.push(e.data);
      recorder.start();
      mediaRef.current = recorder;
      setMeeting(m => m ? { ...m, status: "in_progress" } : m);
      setElapsed(0);
    } catch (e) {
      alert("회의 시작에 실패했습니다.");
      console.error(e);
    }
  };

  const handleEnd = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setEndLoading(true);
    try {
      // 녹음 중지 후 파일 생성
      let audioFile: File | undefined;
      if (mediaRef.current && mediaRef.current.state !== "inactive") {
        await new Promise<void>(resolve => {
          mediaRef.current!.onstop = () => resolve();
          mediaRef.current!.stop();
        });
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        audioFile = new File([blob], `meeting-${meetingId}.webm`, { type: "audio/webm" });
      }
      await endMeeting(meetingId, audioFile);
      navigate(`/meeting/${meetingId}/minutes`);
    } catch (e) {
      alert("회의 종료 처리 중 오류가 발생했습니다.");
      console.error(e);
    } finally {
      setEndLoading(false);
    }
  };

  const sendChat = async () => {
    const q = chatInput.trim();
    if (!q || q.length < 2) return;
    setChatMessages(m => [...m, { role: "user", content: q }]);
    setChatInput("");
    setChatLoading(true);
    try {
      const res = await sendChatMessage(meetingId, q);
      setChatMessages(m => [...m, {
        role: "bot",
        content: res.answer,
        source: res.sources?.join(" · "),
      }]);
    } catch {
      setChatMessages(m => [...m, { role: "bot", content: "답변을 가져오지 못했습니다." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const isScheduled = meeting.status === "scheduled";
  const isInProgress = meeting.status === "in_progress";

  return (
    <div className="flex h-screen">
      {/* 메인 */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{meeting.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
              <span>📅 {meeting.meeting_at?.slice(0, 10)} · {meeting.meeting_at?.slice(11, 16)} – {meeting.end_at?.slice(11, 16)}</span>
              <span>📍 {meeting.location || "장소 미정"}</span>
              <span>참석자 · {meeting.participants?.length}명</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {meeting.participants?.map(p => (
                <div key={p.user_id} className="flex items-center gap-1.5 bg-white border border-gray-100 rounded-full px-3 py-1 text-sm">
                  <div className="w-5 h-5 rounded-full bg-[#F5A623] flex items-center justify-center text-white text-[10px] font-bold">{p.name[0]}</div>
                  <span className="text-gray-700">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium
              ${isScheduled ? "bg-blue-100 text-blue-700" : isInProgress ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {isScheduled ? "회의 예정" : isInProgress ? "진행 중" : "종료"}
            </span>
            {isScheduled && (
              <button onClick={handleStart} className="bg-[#F5A623] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#e8951a]">
                ▶ 회의 시작
              </button>
            )}
            {isInProgress && (
              <button
                onClick={handleEnd}
                disabled={endLoading}
                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 disabled:opacity-60"
              >
                {endLoading ? "처리 중..." : "● 회의 종료"}
              </button>
            )}
          </div>
        </div>

        {isInProgress && (
          <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-5 py-3 mb-5 shadow-sm">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-gray-600">녹음 중</span>
            <span className="text-base font-bold tabular-nums text-gray-900">{fmt(elapsed)}</span>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="font-semibold text-gray-900">회의 준비 자료</span>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${meeting.agenda && meeting.agenda.length > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {meeting.agenda && meeting.agenda.length > 0 ? "기초안건 있음" : "기초안건 없음"}
            </span>
          </div>

          <table className="text-sm mb-5 w-full">
            <tbody>
              {[
                ["회의 주제", meeting.title],
                ["회의 일시", meeting.meeting_at],
                ["회의 장소", meeting.location || "미정"],
                ["참석자", meeting.participants?.map(p => p.name).join(", ")],
              ].map((row, i) => (
                <tr key={i}>
                  <td className="text-gray-400 pr-6 pb-2 w-20 whitespace-nowrap">{row[0]}</td>
                  <td className="pb-2 text-gray-700">{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {meeting.agenda && meeting.agenda.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3 border-b border-gray-100 pb-2">기초 안건</p>
              {meeting.agenda.map((item, i) => (
                <div key={i} className={`flex gap-3 p-4 rounded-xl mb-2 border ${i === 0 ? "bg-amber-50 border-amber-200" : "border-gray-100"}`}>
                  <span className="font-bold text-[#F5A623] text-sm w-6">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{item.content}</p>
                    <p className="text-xs text-gray-400 mt-1">{item.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 챗봇 사이드바 */}
      <div className="w-[280px] flex-shrink-0 bg-white border-l border-gray-100 flex flex-col h-screen sticky top-0">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-800">🔍 회의 검색</p>
          <p className="text-xs text-gray-400 mt-0.5">준비자료 · 이전 회의록 · 내부자료</p>
        </div>

        <div className="flex gap-1 px-3 py-2 border-b border-gray-100">
          {["전체", "내부문서", "회의록", "외부"].map(f => (
            <button
              key={f}
              onClick={() => setChatFilter(f)}
              className={`text-xs px-2.5 py-1 rounded-full border transition
                ${chatFilter === f ? "bg-[#F5A623] text-white border-[#F5A623] font-semibold" : "border-gray-200 text-gray-500 hover:border-[#F5A623]"}`}
            >
              {f}
            </button>
          ))}
        </div>

        <div ref={chatRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
          {!isInProgress && chatMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-300">
              <p className="text-2xl mb-2">💬</p>
              <p className="text-xs">회의 시작 후 사용 가능합니다</p>
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i}>
              {msg.role === "user" ? (
                <div className="self-end ml-6 bg-[#F5A623] text-white text-xs px-3 py-2 rounded-2xl rounded-tr-sm">
                  {msg.content}
                </div>
              ) : (
                <div className="self-start mr-6 bg-gray-100 text-gray-800 text-xs px-3 py-2 rounded-2xl rounded-tl-sm">
                  <p>{msg.content}</p>
                  {msg.source && <p className="text-gray-400 mt-1">📎 {msg.source}</p>}
                </div>
              )}
            </div>
          ))}
          {chatLoading && (
            <div className="self-start mr-6 bg-gray-100 text-gray-400 text-xs px-3 py-2 rounded-2xl rounded-tl-sm">
              답변 생성 중...
            </div>
          )}
        </div>

        <div className="p-3 border-t border-gray-100">
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()}
              disabled={!isInProgress}
              placeholder={isInProgress ? "검색어를 입력하세요..." : "회의 시작 후 사용 가능합니다"}
              className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none disabled:bg-gray-50 disabled:text-gray-300"
            />
            <button
              onClick={sendChat}
              disabled={!isInProgress}
              className="w-8 h-8 rounded-full bg-[#F5A623] flex items-center justify-center text-white text-sm font-bold disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
