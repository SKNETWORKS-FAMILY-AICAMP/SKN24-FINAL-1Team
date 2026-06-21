import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useRecording } from "../../context/RecordingContext";
import mikeImg from "../../assets/meeting/mike.png";
import recordingImg from "../../assets/meeting/recording.png";
import stopImg from "../../assets/meeting/stop.png";
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
  const location = useLocation();
  const meetingId = Number(id);

  // 회의 생성 모달(선택한 섹션 표시 여부) + 목록에서 넘어올 때 status
  const { showAgenda = true, showPrepMaterial = true, status: navStatus } =
    (location.state as { showAgenda?: boolean; showPrepMaterial?: boolean; status?: string }) ?? {};

  const { meetingId: ctxMeetingId, startTime: ctxStartTime, startRecording, stopRecording } = useRecording();

  // 이 회의가 사이드바에서 되돌아온 경우 → 컨텍스트의 startTime으로 경과 시간 복원
  const isReturningToRecording = ctxMeetingId === meetingId && ctxStartTime !== null;
  const initialStatus = isReturningToRecording || navStatus === "in_progress" ? "in_progress" : "scheduled";

  const [meeting, setMeeting] = useState<Meeting | null>({
    meeting_id: meetingId,
    title: "2025 Q3 제품 로드맵 검토",
    location: "3층 대회의실",
    meeting_at: "2025-06-10T14:00:00",
    status: initialStatus,
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
  const [elapsed, setElapsed] = useState(() =>
    isReturningToRecording && ctxStartTime !== null
      ? Math.floor((Date.now() - ctxStartTime) / 1000)
      : 0
  );
  const [chatFilter, setChatFilter] = useState("전체");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [endLoading, setEndLoading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // 아코디언 상태들
  const [agendaOpen, setAgendaOpen] = useState(true);
  const [materialsOpen, setMaterialsOpen] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // 진행 중 상태로 진입했을 때 recording context 설정 (사이드바 타이머용)
  useEffect(() => {
    if (initialStatus === "in_progress" && ctxMeetingId !== meetingId) {
      startRecording(meetingId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // 임시 더미데이터 or API 데이터 세팅
    getMeetingDetail(meetingId)
      .then((data) => {
        if (data && data.title) {
          //포맷 조율
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
    if (meeting?.status === "in_progress" && !isPaused) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [meeting?.status, isPaused]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  if (!meeting) return <div className="p-8 text-gray-400">회의를 찾을 수 없습니다.</div>;

  const fmt = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const handleStart = async () => {
    try {
      await startMeeting(meetingId);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = e => chunksRef.current.push(e.data);
      recorder.start();
      mediaRef.current = recorder;
      startRecording(meetingId);
      setMeeting(m => m ? { ...m, status: "in_progress" } : m);
      setElapsed(0);
    } catch (e) {
      alert("회의 시작에 실패했습니다. (데모 환경에서는 가상으로 회의를 시작합니다.)");
      startRecording(meetingId);
      setMeeting(m => m ? { ...m, status: "in_progress" } : m);
      setElapsed(0);
    }
  };

  const handlePause = () => {
    if (mediaRef.current && mediaRef.current.state === "recording") {
      mediaRef.current.pause();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsPaused(true);
  };

  const handleResume = () => {
    if (mediaRef.current && mediaRef.current.state === "paused") {
      mediaRef.current.resume();
    }
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    setIsPaused(false);
  };

  const handleEnd = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setEndLoading(true);
    stopRecording();
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
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* 상단 회의 정보 및 컨트롤 카드 */}
        <div className={`flex flex-col md:flex-row items-center justify-between p-6 ${DESIGN.BORDER_COLORS.lightGray} ${DESIGN.RADIUS_SIZES.xl} ${DESIGN.BACKGROUND_COLORS.white} shadow-sm gap-6`}>
          <div className="flex-1">
            <h1 className={`${DESIGN.FONT_SIZES.h3} ${DESIGN.COLORS.black} font-bold mb-2`}>{meeting.title}</h1>
            <div className={`flex flex-wrap items-center gap-4 ${DESIGN.FONT_SIZES.sm} ${DESIGN.COLORS.gray} mb-3`}>
              <span> {meeting.meeting_at?.slice(0, 10)} · {meeting.meeting_at?.slice(11, 16) || "14:00"} - 16:00</span>
              <span> {meeting.location || "3층 대회의실"}</span>
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

          {/* 중앙 타이머/우측 보이스 레코더 컨트롤 */}
          <div className="flex items-center gap-6">
            <div className="text-[32px] font-bold tabular-nums text-gray-900 leading-none">
              {isInProgress ? fmt(elapsed) : "00:00:00"}
            </div>
            
            {/* 녹음 버튼(상태별 이미지 전환) */}
            <button
              onClick={
                isScheduled ? handleStart
                : isPaused ? handleResume
                : handlePause
              }
              disabled={endLoading}
              className="active:scale-95 transition w-[60px] h-[60px] flex items-center justify-center"
            >
              {isScheduled && (
                <img src={mikeImg} alt="녹음 시작" className="w-full h-full object-contain" />
              )}
              {isInProgress && !isPaused && (
                <img src={recordingImg} alt="녹음 중지" className="w-[38px] h-[38px] object-contain" />
              )}
              {isInProgress && isPaused && (
                <img src={stopImg} alt="녹음 재개" className="w-[38px] h-[38px] object-contain" />
              )}
            </button>
          </div>
        </div>

        {/* 기초 안건 아코디언(생성 모달에서 선택한 경우만 표시) */}
        {showAgenda && <div className={`${DESIGN.BACKGROUND_COLORS.grayLight} ${DESIGN.RADIUS_SIZES.xl} overflow-hidden shadow-sm`}>
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
            <div className="px-5 pb-5 pt-1 space-y-3">
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
        </div>}

        {/* 회의 준비 자료 아코디언(생성 모달에서 선택한 경우만 표시) */}
        {showPrepMaterial && <div className={`${DESIGN.BACKGROUND_COLORS.grayLight} ${DESIGN.RADIUS_SIZES.xl} overflow-hidden shadow-sm`}>
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
            <div className="px-5 pb-5 pt-1 space-y-5">

              {/*회의 목적 */}
              <div>
                <p className="text-[14px] text-[#141414] font-bold mb-2">회의 목적</p>
                <div className="bg-white rounded-xl p-4 border border-[#E6E1E6] space-y-1">
                  {["상반기 채용 진행 상황 공유", "신규 입사자 온보딩 현황 공유", "조직 개편 현황 공유", "직원 만족도 조사 결과 공유", "채용 프로세스 개선 방안 논의", "온보딩 자료 개선 방안 논의", "유연근무제 확대, 복지 포인트 확대 등 논의", "리더십 교육, 신규 입사자 멘토 제도 재운영 검토"].map((item, i) => (
                    <p key={i} className="text-[13px] text-[#141414]">- {item}</p>
                  ))}
                </div>
              </div>

              {/*프로젝트 현재 상태 */}
              <div>
                <p className="text-[14px] text-[#141414] font-bold mb-2">프로젝트 현재 상태</p>
                <div className="bg-white rounded-xl p-4 border border-[#E6E1E6] space-y-3">
                  <div>
                    <p className="text-[13px] text-[#141414] font-semibold">채용 현황</p>
                    {["현재 지원자 수는 전체 기준 130명이며, 개발팀 특히 백엔드 지원자가 많음.", "프로젝트 경험은 적게 있지만 협업 경험 설명이 부족한 지원자가 다수 존재.", "기술 면접 외에 협업 경험, 문제 해결 방식 등의 확인 필요.", "1차 온라인 면접, 최종 오프라인 면접 진행 방향으로 재정리."].map((t, i) => (
                      <p key={i} className="text-[13px] text-[#141414]">- {t}</p>
                    ))}
                  </div>
                  <div>
                    <p className="text-[13px] text-[#141414] font-semibold">신규 입사자 온보딩</p>
                    {["기존 온보딩 자료가 막연하다는 피드백이 다수 존재.", "회사 분위기, 업무 흐름 등 신규 입사자의 궁금증 해소 필요.", "협업 툴(슬랙, 노션, 지라) 사용법 포함 및 FAQ 문서 별도 제작 검토."].map((t, i) => (
                      <p key={i} className="text-[13px] text-[#141414]">- {t}</p>
                    ))}
                  </div>
                  <div>
                    <p className="text-[13px] text-[#141414] font-semibold">조직 개편</p>
                    {["데이터팀/서비스팀 재배치 등 기능 중심 조직으로 일부 변경 검토.", "디자인팀도 서비스 단위 조직 논의 중.", "중복 회의 감소를 위한 회의 체계 정리 필요 (회의 전 안건 정리 및 공유 문화 정착, 회의 목적 명확화)."].map((t, i) => (
                      <p key={i} className="text-[13px] text-[#141414]">- {t}</p>
                    ))}
                  </div>
                  <div>
                    <p className="text-[13px] text-[#141414] font-semibold">직원 만족도</p>
                    {["유연근무제 확대 요구 다수 (팀별 특성을 고려해 유연하게 운영 검토).", "복지 포인트 사용 항목 확대 (운동, 자기개발 지원)."].map((t, i) => (
                      <p key={i} className="text-[13px] text-[#141414]">- {t}</p>
                    ))}
                  </div>
                </div>
              </div>

              {/*관련 규정 및 제약사항 */}
              <div>
                <p className="text-[14px] text-[#141414] font-bold mb-2">관련 규정 및 제약사항</p>
                <div className="bg-white rounded-xl p-4 border border-[#E6E1E6] space-y-3">
                  <div>
                    <p className="text-[13px] text-[#141414] font-semibold">임금피크제 운영지침 (2025.12.04 개정)</p>
                    {["별도직무표에 따른 직무 수행 가능.", "경영지원관: 직원 채용 면접 진행.", "정책연구관: 신규사업 발굴 연구 수행.", "사내교수: 업무매뉴얼 작성 및 부서 간 협업 과제 추진."].map((t, i) => (
                      <p key={i} className="text-[13px] text-[#141414]">- {t}</p>
                    ))}
                  </div>
                  <div>
                    <p className="text-[13px] text-[#141414] font-semibold">직제규칙 (2026.04.30 개정)</p>
                    <p className="text-[13px] text-[#141414]">- 인사총무팀에서 인력 채용 및 배치, 직원 역량 개발 및 교육 훈련 담당.</p>
                  </div>
                  <div>
                    <p className="text-[13px] text-[#141414] font-semibold">직원 채용 지침 (2025.12.04 개정)</p>
                    <p className="text-[13px] text-[#141414]">- 지원자의 발표 자료 작성, 발표 및 질의응답으로 진행하며 평가.</p>
                  </div>
                </div>
              </div>

              {/*회의 종료 후 기대 결과 */}
              <div>
                <p className="text-[14px] text-[#141414] font-bold mb-2">회의 종료 후 기대 결과</p>
                <div className="bg-white rounded-xl p-4 border border-[#E6E1E6] space-y-1">
                  {["채용 프로세스 개선 방안 확정", "온보딩 자료 개선 방향 결정", "유연근무제 확대 및 복지 개선 방안 합의", "리더십 교육 및 멘토 제도 재운영 계획 수립"].map((item, i) => (
                    <p key={i} className="text-[13px] text-[#141414]">- {item}</p>
                  ))}
                </div>
              </div>

              {/*참조 문서 목록 */}
              <div>
                <p className="text-[14px] text-[#141414] font-bold mb-2">참조 문서 목록</p>
                <div className="bg-white rounded-xl p-4 border border-[#E6E1E6] space-y-1">
                  <p className="text-[13px]">
                    <span className="text-[#141414]">- 프로젝트 히스토리 </span>
                    <span className="text-[#623FB5] hover:underline cursor-pointer">더보기</span>
                  </p>
                  <p className="text-[13px]">
                    <span className="text-[#141414]">- 내부 문서 (임금피크제 운영지침, 직제규칙, 직원 채용 지침) </span>
                    <span className="text-[#623FB5] hover:underline cursor-pointer">더보기</span>
                  </p>
                </div>
              </div>

            </div>
          )}
        </div>}
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
              <p className={`${DESIGN.FONT_SIZES.sm} text-gray-400`}>회의 시작 후 사용 가능합니다</p>
            </div>
          ) : (
            chatMessages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`text-xs px-3 py-2 rounded-2xl max-w-[85%] border ${
                    msg.role === "user"
                      ? "bg-[#F3F0FF] border-[#623FB5] text-[#141414] rounded-tr-sm"
                      : "bg-[#FAF9F7] border-[#FAF9F7] text-[#141414] rounded-tl-sm"
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
              {/*송신 아이콘 */}
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
