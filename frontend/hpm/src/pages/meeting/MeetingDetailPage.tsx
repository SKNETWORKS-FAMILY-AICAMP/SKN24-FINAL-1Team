import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getMeetingDetail,
  startMeeting,
  endMeeting,
  sendChatMessage,
  type Meeting,
} from "../../services/meeting";
import * as DESIGN from "../../constants/design";

type ChatMsg = { role: "user" | "bot"; content: string; source?: string };

export default function MeetingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const meetingId = Number(id);

  const [meeting, setMeeting] = useState<Meeting | null>({
    meeting_id: meetingId,
    title: "2025 Q3 제품 로드맵 검토",
    location: "3층 대회의실",
    meeting_at: "2025-06-10T14:00:00",
    status: "scheduled",
    minutes_status: "draft",
    meeting_document: null,
    is_meeting: true,
    project: 1,
    participants: [
      { user_id: 1, name: "김민준(팀장)" },
      { user_id: 2, name: "김지원" },
      { user_id: 3, name: "김규호" },
      { user_id: 4, name: "류지우" }
    ],
    agenda: [
      { content: "상반기 채용 진행 상황 공유", reason: "각 부서별 채용 인원 및 온보딩 일정 확인" },
      { content: "신규 입사자 온보딩 현황 공유", reason: "온보딩 자료 개선 및 멘토 피드백 수렴" },
      { content: "조직 개편 현황 공유", reason: "개발본부 조직 개편 세부사항 안내" },
      { content: "직원 만족도 조사 결과 공유", reason: "만족도 조사 종합 피드백 공유" }
    ]
  });
  const [elapsed, setElapsed] = useState(0);
  const [chatFilter, setChatFilter] = useState("전체");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [endLoading, setEndLoading] = useState(false);

  // 아코디언 상태들
  const [agendaOpen, setAgendaOpen] = useState(true);
  const [materialsOpen, setMaterialsOpen] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // 임시 더미데이터 혹은 API 데이터 세팅
    getMeetingDetail(meetingId)
      .then((data) => {
        if (data && data.title) {
          // 실 데이터가 있는 경우 포맷 조율
          if (data.status !== "scheduled" && data.status !== "in_progress") {
            navigate(`/meetings/${meetingId}/minutes`, { replace: true });
          } else {
            setMeeting(data);
          }
        }
      })
      .catch(() => {});
  }, [meetingId, navigate]);

  useEffect(() => {
    if (meeting?.status === "in_progress") {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [meeting?.status]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages, chatLoading]);

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
      alert("회의 시작에 실패했습니다. (데모 환경에서는 가상으로 회의를 시작합니다.)");
      setMeeting(m => m ? { ...m, status: "in_progress" } : m);
      setElapsed(0);
    }
  };

  const handleEnd = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setEndLoading(true);
    try {
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
      navigate(`/meetings/${meetingId}/minutes`);
    } catch (e) {
      alert("회의가 종료되었습니다. (회의록 상세화면으로 이동합니다.)");
      navigate(`/meetings`);
    } finally {
      setEndLoading(false);
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const query = chatInput.trim();
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: query }]);
    setChatLoading(true);
    try {
      const res = await sendChatMessage(meetingId, query);
      const sourcesStr = res.sources && res.sources.length > 0 ? res.sources.join(", ") : undefined;
      setChatMessages(prev => [...prev, { role: "bot", content: res.answer, source: sourcesStr }]);
    } catch (e) {
      setChatMessages(prev => [...prev, { role: "bot", content: "답변을 가져오는데 실패했습니다." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const isScheduled = meeting.status === "scheduled";
  const isInProgress = meeting.status === "in_progress";

  return (
    <div className="flex w-full h-[calc(100vh-112px)] overflow-hidden">
      {/* 메인 영역 */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {/* 상단 회의 정보 및 컨트롤 카드 */}
        <div className={`flex flex-col md:flex-row items-center justify-between p-6 ${DESIGN.BORDER_COLORS.lightGray} ${DESIGN.RADIUS_SIZES.xl} ${DESIGN.BACKGROUND_COLORS.white} shadow-sm gap-6`}>
          <div className="flex-1">
            <h1 className={`${DESIGN.FONT_SIZES.h3} ${DESIGN.COLORS.black} font-bold mb-2`}>{meeting.title}</h1>
            <div className={`flex flex-wrap items-center gap-4 ${DESIGN.FONT_SIZES.sm} ${DESIGN.COLORS.gray} mb-3`}>
              <span>📅 {meeting.meeting_at?.slice(0, 10)} · {meeting.meeting_at?.slice(11, 16) || "14:00"} - 16:00</span>
              <span>📍 {meeting.location || "3층 대회의실"}</span>
            </div>
            
            {/* 참석자 정보 */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`${DESIGN.FONT_SIZES.sm} ${DESIGN.COLORS.gray} mr-1`}>
                참석자 {meeting.participants?.length}명 :
              </span>
              {meeting.participants?.map((p, idx) => (
                <span key={p.user_id} className={`${DESIGN.FONT_SIZES.sm} ${DESIGN.COLORS.black} font-semibold`}>
                  {p.name}{idx < (meeting.participants?.length || 0) - 1 ? "," : ""}
                </span>
              ))}
            </div>
          </div>

          {/* 중앙 타이머 & 우측 보이스 레코더 컨트롤 */}
          <div className="flex items-center gap-6">
            <div className="text-[32px] font-bold tabular-nums text-gray-900 leading-none">
              {isInProgress ? fmt(elapsed) : "00:00:00"}
            </div>
            
            {/* 마이크 버튼 ( start / stop ) */}
            <button
              onClick={isScheduled ? handleStart : handleEnd}
              disabled={endLoading}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition shadow-md active:scale-95 ${
                isInProgress
                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                  : `${DESIGN.BACKGROUND_COLORS.black} hover:bg-[#141414]/90 text-white`
              }`}
              title={isScheduled ? "회의 시작" : "회의 종료"}
            >
              {isInProgress ? (
                // 정지 모양 아이콘 (종료)
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M6 6h12v12H6z" />
                </svg>
              ) : (
                // 마이크 모양 아이콘 (시작)
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.2 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* 기초 안건 아코디언 */}
        <div className={`${DESIGN.BACKGROUND_COLORS.grayLight} ${DESIGN.RADIUS_SIZES.xl} overflow-hidden shadow-sm`}>
          <button
            onClick={() => setAgendaOpen(!agendaOpen)}
            className="w-full flex items-center justify-between p-5 text-left outline-none"
          >
            <span className={`${DESIGN.FONT_SIZES.lg} ${DESIGN.COLORS.black} font-semibold`}>기초 안건</span>
            <span className={`transform transition-transform duration-200 ${agendaOpen ? "rotate-180" : ""}`}>
              {/* 위/아래 방향 꺾쇠 */}
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>
          
          {agendaOpen && (
            <div className="px-5 pb-5 pt-1 flex flex-col gap-3">
              {meeting.agenda && meeting.agenda.length > 0 ? (
                meeting.agenda.map((item, idx) => (
                  <div key={idx} className={`${DESIGN.BACKGROUND_COLORS.white} ${DESIGN.RADIUS_SIZES.md} p-4 border border-[#E6E1E6] flex gap-3 items-start`}>
                    <span className="text-[#623FB5] font-bold text-[15px]">{idx + 1}.</span>
                    <div>
                      <p className={`${DESIGN.FONT_SIZES.md} ${DESIGN.COLORS.black} font-medium`}>{item.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className={`${DESIGN.FONT_SIZES.sm} ${DESIGN.COLORS.gray} text-center py-4`}>등록된 기초 안건이 없습니다.</p>
              )}
            </div>
          )}
        </div>

        {/* 회의 준비 자료 아코디언 */}
        <div className={`${DESIGN.BACKGROUND_COLORS.grayLight} ${DESIGN.RADIUS_SIZES.xl} overflow-hidden shadow-sm`}>
          <button
            onClick={() => setMaterialsOpen(!materialsOpen)}
            className="w-full flex items-center justify-between p-5 text-left outline-none"
          >
            <span className={`${DESIGN.FONT_SIZES.lg} ${DESIGN.COLORS.black} font-semibold`}>회의 준비 자료</span>
            <span className={`transform transition-transform duration-200 ${materialsOpen ? "rotate-180" : ""}`}>
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          </button>

          {materialsOpen && (
            <div className="px-5 pb-5 pt-1 flex flex-col gap-5">
              {/* 카드 형태의 문서 데이터 */}
              <div className={`${DESIGN.BACKGROUND_COLORS.white} ${DESIGN.RADIUS_SIZES.md} p-6 border border-[#E6E1E6] flex flex-col gap-6`}>
                {/* 1. 회의 목적 */}
                <div>
                  <h3 className={`${DESIGN.FONT_SIZES.md} ${DESIGN.COLORS.black} font-bold border-b pb-2 mb-3`}>회의 목적</h3>
                  <ul className={`list-disc pl-5 ${DESIGN.FONT_SIZES.sm} ${DESIGN.COLORS.black} space-y-1.5`}>
                    <li>상반기 채용 진행 상황 공유</li>
                    <li>신규 입사자 온보딩 현황 공유</li>
                    <li>조직 개편 현황 공유</li>
                    <li>직원 만족도 조사 결과 공유</li>
                    <li>채용 프로세스 개선 방안 논의</li>
                    <li>온보딩 자료 개선 방안 논의</li>
                    <li>유연근무제 확대, 복지 포인트 확대 등 논의</li>
                    <li>리더십 교육, 신규 입사자 멘토 제도 재운영 검토</li>
                  </ul>
                </div>

                {/* 2. 프로젝트 현재 상태 */}
                <div>
                  <h3 className={`${DESIGN.FONT_SIZES.md} ${DESIGN.COLORS.black} font-bold border-b pb-2 mb-3`}>프로젝트 현재 상태</h3>
                  <div className={`space-y-4 ${DESIGN.FONT_SIZES.sm} ${DESIGN.COLORS.black}`}>
                    <div>
                      <p className="font-semibold">채용 현황</p>
                      <p className="text-gray-600 mt-1">현재 지원자 수는 전체 기준 130명이며, 개발팀 특히 백엔드 지원자가 많음.</p>
                      <p className="text-gray-600">프로젝트 경험은 적게 있지만 협업 경험 설명이 부족한 지원자가 다수 존재.</p>
                      <p className="text-gray-600">기술 면접 위에 협업 경험, 문제 해결 방식 등의 확인 필요.</p>
                      <p className="text-gray-600">1차 온라인 면접, 최종 오프라인 면접 진행 방향으로 재정리.</p>
                    </div>
                    <div>
                      <p className="font-semibold">신규 입사자 온보딩</p>
                      <p className="text-gray-600 mt-1">기존 온보딩 자료가 막연하다는 피드백이 다수 존재.</p>
                      <p className="text-gray-600">회사 분위기, 업무 흐름 등 신규 입사자의 궁금증 해소 필요.</p>
                      <p className="text-gray-600">협업 툴(슬랙, 노션, 지라) 사용법 포함 및 FAQ 문서 별도 제작 검토.</p>
                    </div>
                    <div>
                      <p className="font-semibold">조직 개편</p>
                      <p className="text-gray-600 mt-1">데이터팀/서비스팀 재배치 등 기능 중심 조직으로 일부 변경 검토.</p>
                      <p className="text-gray-600">디자인팀도 서비스 단위 조직 논의 중.</p>
                      <p className="text-gray-600">중복 회의 감소를 위한 회의 체계 정리 필요 (회의 전 안건 정리 및 공유 문화 정착, 회의 목적 명확화).</p>
                    </div>
                    <div>
                      <p className="font-semibold">직원 만족도</p>
                      <p className="text-gray-600 mt-1">유연근무제 확대 요구 다수 (팀별 특성을 고려해 유연하게 운영 검토).</p>
                      <p className="text-gray-600">복지 포인트 사용 항목 확대 (운동, 자기개발 지원).</p>
                    </div>
                  </div>
                </div>

                {/* 3. 관련 규정 및 제약사항 */}
                <div>
                  <h3 className={`${DESIGN.FONT_SIZES.md} ${DESIGN.COLORS.black} font-bold border-b pb-2 mb-3`}>관련 규정 및 제약사항</h3>
                  <ul className={`list-disc pl-5 ${DESIGN.FONT_SIZES.sm} ${DESIGN.COLORS.black} space-y-1.5`}>
                    <li>임금피크제 운영지침 (2025.12.04 개정) : 별도직무표에 따른 직무 수행 가능.</li>
                    <li>경영지원관 : 직원 채용 연장 진행.</li>
                    <li>정책연구관 : 신규사업 발굴 연구 수행.</li>
                    <li>사내교수 : 업무매뉴얼 작성 및 부서 간 협업 과제 추진.</li>
                    <li>적재규칙 (2026.04.30 개정) : 인사교류원에서 인력 채용 및 배치, 직원 역량 개발 및 교육 훈련 담당.</li>
                    <li>직원 채용 지침 (2025.12.04 개정) : 지원자의 발표 자료 작성, 발표 및 질의응답으로 진행하여 평가.</li>
                  </ul>
                </div>

                {/* 4. 회의 종료 후 기대 결과 */}
                <div>
                  <h3 className={`${DESIGN.FONT_SIZES.md} ${DESIGN.COLORS.black} font-bold border-b pb-2 mb-3`}>회의 종료 후 기대 결과</h3>
                  <ul className={`list-disc pl-5 ${DESIGN.FONT_SIZES.sm} ${DESIGN.COLORS.black} space-y-1.5`}>
                    <li>채용 프로세스 개선 방안 확정</li>
                    <li>온보딩 자료 개선 방향 결정</li>
                    <li>유연근무제 확대 및 복지 개선 방안 합의</li>
                    <li>리더십 교육 및 멘토 제도 재운영 계획 수립</li>
                  </ul>
                </div>

                {/* 5. 참조 문서 목록 */}
                <div>
                  <h3 className={`${DESIGN.FONT_SIZES.md} ${DESIGN.COLORS.black} font-bold border-b pb-2 mb-3`}>참조 문서 목록</h3>
                  <ul className={`space-y-1.5 ${DESIGN.FONT_SIZES.sm}`}>
                    <li>
                      <span className="text-[#623FB5] hover:underline cursor-pointer">프로젝트 리스크리</span>{" "}
                      <span className="text-gray-400 cursor-pointer">더보기</span>
                    </li>
                    <li>
                      <span className="text-[#623FB5] hover:underline cursor-pointer">내부 문서 (임금피크제 운영지침, 적재규칙, 직원 채용 지침)</span>{" "}
                      <span className="text-gray-400 cursor-pointer">더보기</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 우측 챗봇 패널 */}
      <div className="w-[320px] flex-shrink-0 bg-white border-l border-gray-100 flex flex-col h-full">
        {/* 챗봇 헤더 */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className={`${DESIGN.FONT_SIZES.md} ${DESIGN.COLORS.black} font-bold`}>회의 챗봇</span>
        </div>

        {/* 챗봇 바디 */}
        <div ref={chatRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {!isInProgress && chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-300">
              <span className="text-3xl mb-2">💬</span>
              <p className={`${DESIGN.FONT_SIZES.sm} text-gray-400`}>회의 시작 후 사용 가능합니다</p>
            </div>
          ) : (
            chatMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`text-xs px-3 py-2 rounded-2xl max-w-[85%] ${
                    msg.role === "user"
                      ? "bg-[#623FB5] text-white rounded-tr-sm"
                      : "bg-gray-100 text-gray-800 rounded-tl-sm"
                  }`}
                >
                  <p>{msg.content}</p>
                  {msg.source && <p className="text-[10px] text-gray-400 mt-1">📎 {msg.source}</p>}
                </div>
              </div>
            ))
          )}
          {chatLoading && (
            <div className="items-start flex flex-col">
              <div className="bg-gray-100 text-gray-400 text-xs px-3 py-2 rounded-2xl rounded-tl-sm">
                답변 생성 중...
              </div>
            </div>
          )}
        </div>

        {/* 챗봇 인풋 */}
        <div className="p-4 border-t border-gray-100">
          <div className="relative flex items-center">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendChat()}
              disabled={!isInProgress}
              placeholder={isInProgress ? "챗봇한테 질문해보세요" : "회의 시작 후 사용 가능합니다"}
              className="w-full text-xs pl-4 pr-10 py-3 border border-gray-200 rounded-xl outline-none focus:border-[#623FB5] disabled:bg-gray-50 disabled:text-gray-300 transition"
            />
            <button
              onClick={sendChat}
              disabled={!isInProgress}
              className="absolute right-2.5 w-7 h-7 rounded-full bg-[#623FB5] flex items-center justify-center text-white hover:opacity-90 active:scale-95 disabled:opacity-30 transition"
              aria-label="전송"
            >
              {/* 종이비행기 송신 아이콘 (SVG) */}
              <svg className="w-3.5 h-3.5 fill-current transform rotate-45 -translate-x-[1px] translate-y-[0.5px]" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
