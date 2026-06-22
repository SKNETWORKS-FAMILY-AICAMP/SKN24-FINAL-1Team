import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  getMeetingDetail,
  getTaskList,
  sendChatMessage,
  type Meeting,
  type Task,
} from "../../services/meeting";
import {
  SPEAKER_PARTICIPANTS,
  SPEAKER_SEGMENTS,
} from "../../constants/speakerMapping";

type TabKey = "minutes" | "record" | "chatbot" | "material" | "email";

const TABS: { key: TabKey; label: string }[] = [
  { key: "minutes",  label: "회의록" },
  { key: "record",   label: "녹음 원문" },
  { key: "chatbot",  label: "챗봇내역" },
  { key: "material", label: "회의 자료" },
  { key: "email",    label: "이메일 발송" },
];

const DUMMY_MEETING: Meeting = {
  meeting_id: 0,
  title: "AI 매칭 엔진 스프린트 리뷰",
  location: "대륭 17자 18층",
  meeting_at: "2025-05-29T09:00:00",
  status: "finished",
  minutes_status: "approved",
  meeting_document: `AI 매칭 엔진 고도화 및 포털 관련 회의
1. AI 매칭 엔진 고도화 현황
  - 기존 키워드 매칭에서 임베딩 기반 시맨틱 매칭으로 전환 중.
  - 프로토타입 결과: Top 5 적합 공급기업 포항을 기준 대비 약 23% 개선.
  - 결정 사항: 우선 1차(LLM 리라이팅) 방식으로 진행, 파인튜닝은 2차로 추진.
2. 보안 및 인프라 검토
  - 운영 서버에서 외부 API(LLM) 호출 시 보안 정책 준수 여부 파악 필요.
3. 포털 프론트엔드 개편 및 기타 안건
  - 수요기업 온보딩 플로우 내 업종 코드 자동 분류 기능 추가 요청 접수.`,
  is_meeting: true,
  project: 1,
  participants: [
    { user_id: 1, name: "규김호" },
    { user_id: 2, name: "김원지" },
    { user_id: 3, name: "류지우" },
    { user_id: 4, name: "수박영" },
    { user_id: 5, name: "인규황" },
  ],
};

const DUMMY_TASKS: Task[] = [
  {
    meeting_task_id: 1,
    title: "사내 클라우드 보호처 신청 절차 및 예산 코드",
    content: "파인튜닝용 GPU 서버 확보를 위해 사내 클라우드 보호처 신청 절차와 관련된 코드 적정성을 확인하여 보고",
    owner: "류지우",
    due_date: "2025-10-20",
    priority: "High",
    status: 0,
  },
  {
    meeting_task_id: 2,
    title: "사내 클라우드 보호처 신청 절차 및 예산 코드",
    content: "파인튜닝용 GPU 서버 확보를 위해 사내 클라우드 보호처 신청 절차와 관련된 예산 코드 적정성을 확인하여 보고",
    owner: "류지우",
    due_date: "2025-10-20",
    priority: "High",
    status: 0,
  },
];

const PRIORITY_LABEL: Record<string, string> = {
  High: "높음", Medium: "중간", Low: "낮음", Lowest: "최하",
};

const PREP_SECTIONS = [
  {
    label: "회의 목적",
    value: "- 상반기 채용 진행 상황 공유\n- 신규 입사자 온보딩 현황 공유\n- 조직 개편 현황 공유\n- 직원 만족도 조사 결과 공유\n- 채용 프로세스 개선 방안 논의\n- 온보딩 자료 개선 방안 논의\n- 유연근무제 확대, 복지 포인트 확대 등 논의",
  },
  {
    label: "프로젝트 현재 상태",
    value: "채용 현황\n- 현재 지원자 수는 전체 기준 130명이며, 개발팀 특히 백엔드 지원자가 많음.\n- 프로젝트 경험은 적게 있지만 협업 경험 설명이 부족한 지원자가 다수 존재.\n신규 입사자 온보딩\n- 기존 온보딩 자료가 막연하다는 피드백이 다수 존재.\n- 협업 툴(슬랙, 노션, 지라) 사용법 포함 및 FAQ 문서 별도 제작 검토.\n직원 만족도\n- 유연근무제 확대 요구 다수.\n- 복지 포인트 사용 항목 확대.",
  },
  {
    label: "관련 규정 및 제약사항",
    value: "임금피크제 운영지침 (2025.12.04 개정)\n- 별도직무표에 따른 직무 수행 가능.\n직제규칙 (2026.04.30 개정)\n- 인사총무팀에서 인력 채용 및 배치, 직원 역량 개발 및 교육 훈련 담당.\n직원 채용 지침 (2025.12.04 개정)\n- 지원자의 발표 자료 작성, 발표 및 질의응답으로 진행하며 평가.",
  },
  {
    label: "회의 종료 후 기대 결과",
    value: "- 채용 프로세스 개선 방안 확정\n- 온보딩 자료 개선 방향 결정\n- 유연근무제 확대 및 복지 개선 방안 합의\n- 리더십 교육 및 멘토 제도 재운영 계획 수립",
  },
];

const PREP_REFERENCES = [
  "프로젝트 히스토리",
  "내부 문서 (임금피크제 운영지침, 직제규칙, 직원 채용 지침)",
];

const DUMMY_AGENDA = [
  "AI 매칭 엔진 고도화 진행 현황 검토",
  "포털 프론트엔드 개편 수행기간 진도 점검",
  "상반기 실태 점검 대응 준비",
];

interface ChatMessage {
  role: "user" | "bot";
  text: string;
}

function getAllUtterances() {
  const items: { time: string; sortKey: string; speakerName: string; content: string[] }[] = [];
  for (const segment of SPEAKER_SEGMENTS) {
    const participant = SPEAKER_PARTICIPANTS.find(p => p.id === segment.mappedParticipantId);
    const speakerName = participant ? `${participant.name} (${participant.position})` : segment.label;
    for (const utt of segment.utterances) {
      items.push({ time: utt.time, sortKey: utt.time, speakerName, content: utt.content });
    }
  }
  items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  return items;
}

export default function MeetingArchivePage() {
  const { id } = useParams();
  const meetingId = Number(id);

  const [tab, setTab] = useState<TabKey>("minutes");
  const [meeting, setMeeting] = useState<Meeting>(DUMMY_MEETING);
  const [tasks, setTasks] = useState<Task[]>(DUMMY_TASKS);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set([1, 2]));
  const [downloading, setDownloading] = useState(false);

  // 챗봇
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "bot", text: "안녕하세요! 회의 내용에 대해 무엇이든 질문해 주세요." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 이메일 발송
  const [recipients, setRecipients] = useState(DUMMY_MEETING.participants ?? []);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    Promise.all([getMeetingDetail(meetingId), getTaskList(meetingId)])
      .then(([m, t]) => {
        if (m?.title) {
          setMeeting(m);
          if (m.participants?.length) setRecipients(m.participants);
        }
        if (t?.length) setTasks(t);
      })
      .catch(() => {});
  }, [meetingId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const toggleExpand = (taskId: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(taskId) ? next.delete(taskId) : next.add(taskId);
      return next;
    });
  };

  const formatDate = (iso: string) =>
    iso ? iso.replace("T", " ").slice(0, 16) : "-";

  const participantNames = meeting.participants?.map(p => p.name).join(", ") || "-";
  const writer = meeting.participants?.[0]?.name || "-";

  const handlePdfDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const W = 794;
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        position:absolute; top:-9999px; left:-9999px;
        width:${W}px; background:#fff;
        padding:48px 48px 60px;
        font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;
        box-sizing:border-box; color:#141414;
      `;

      // 회의록 카드
      const card = document.createElement("div");
      card.style.cssText = `border:1px solid #D0D0D0; border-radius:12px; margin-bottom:20px; overflow:hidden;`;

      const cardHeader = document.createElement("div");
      cardHeader.style.cssText = `padding:14px 20px; border-bottom:1px solid #D0D0D0; font-size:15px; font-weight:700; text-align:left;`;
      cardHeader.textContent = "회의록";
      card.appendChild(cardHeader);

      const table = document.createElement("table");
      table.style.cssText = `width:100%; border-collapse:collapse; font-size:13px;`;

    
      const mkTd = (text: string, isLabel: boolean, opts: { colSpan?: number; borderRight?: boolean; borderBottom?: boolean } = {}) => {
        const td = document.createElement("td");
        if (opts.colSpan) td.colSpan = opts.colSpan;
        const borderR = opts.borderRight !== false && isLabel ? "border-right:1px solid #D0D0D0;" : (opts.borderRight ? "border-right:1px solid #D0D0D0;" : "");
        const borderB = opts.borderBottom !== false ? "border-bottom:1px solid #D0D0D0;" : "";
        td.style.cssText = isLabel
          ? `padding:14px 16px; font-weight:600; color:#555; background:#FAFAFA; width:110px; white-space:nowrap; ${borderR}${borderB}`
          : `padding:14px 16px; color:#141414; ${borderR}${borderB}`;
        td.textContent = text;
        return td;
      };

      // 회의 주제
      const r1 = document.createElement("tr");
      r1.appendChild(mkTd("회의 주제", true, { borderBottom: true }));
      r1.appendChild(mkTd(meeting.title, false, { borderBottom: true }));
      table.appendChild(r1);

      // 회의 일시 + 작성자
      const r2 = document.createElement("tr");
      r2.appendChild(mkTd("회의 일시", true, { borderBottom: true }));
      r2.appendChild(mkTd(formatDate(meeting.meeting_at), false, { borderRight: true, borderBottom: true }));
      r2.appendChild(mkTd("작성자", true, { borderBottom: true }));
      r2.appendChild(mkTd(writer, false, { borderBottom: true }));
      table.appendChild(r2);

      // 회의 장소
      const r3 = document.createElement("tr");
      r3.appendChild(mkTd("회의 장소", true, { borderBottom: true }));
      r3.appendChild(mkTd(meeting.location || "-", false, { borderBottom: true }));
      table.appendChild(r3);

      // 참석자 
      const r4 = document.createElement("tr");
      r4.appendChild(mkTd("참석자", true, { borderBottom: false }));
      r4.appendChild(mkTd(participantNames, false, { borderBottom: false }));
      table.appendChild(r4);

      card.appendChild(table);

      // 회의 내용
      if (meeting.meeting_document) {
        const secHeader = document.createElement("div");
        secHeader.style.cssText = `padding:12px 20px; text-align:center; font-size:13px; font-weight:600; color:#141414; background:#F4F5F8; border-top:1px solid #D0D0D0; border-bottom:1px solid #D0D0D0;`;
        secHeader.textContent = "회의 내용";
        card.appendChild(secHeader);

        const docBox = document.createElement("div");
        docBox.style.cssText = `padding:16px 20px; font-size:13px; line-height:1.9; white-space:pre-wrap; color:#333;`;
        docBox.textContent = meeting.meeting_document;
        card.appendChild(docBox);
      }

      wrapper.appendChild(card);

      // 업무 카드 
      const taskCard = document.createElement("div");
      taskCard.style.cssText = `border:1px solid #D0D0D0; border-radius:12px; overflow:hidden;`;

      const taskHeader = document.createElement("div");
      taskHeader.style.cssText = `padding:12px 20px; text-align:center; font-size:13px; font-weight:600; color:#141414; background:#F4F5F8; border-bottom:1px solid #D0D0D0;`;
      taskHeader.textContent = "업무";
      taskCard.appendChild(taskHeader);

      // 컬럼 헤더
      const taskColHeader = document.createElement("div");
      taskColHeader.style.cssText = `display:grid; grid-template-columns:1fr 120px 130px 100px; padding:12px 20px; font-size:12px; font-weight:700; color:#555; background:#FAFAFA; border-bottom:1px solid #D0D0D0;`;
      ["업무명", "담당자", "기한", "우선순위"].forEach((label, i) => {
        const span = document.createElement("span");
        span.textContent = label;
        if (i > 0) span.style.textAlign = "center";
        taskColHeader.appendChild(span);
      });
      taskCard.appendChild(taskColHeader);

      tasks.forEach((t) => {
        // 업무 메인 행
        const row = document.createElement("div");
        row.style.cssText = `display:grid; grid-template-columns:1fr 120px 130px 100px; padding:14px 20px; font-size:13px; align-items:center; border-bottom:1px solid #D0D0D0;`;

        const nameSpan = document.createElement("span"); nameSpan.textContent = t.title; nameSpan.style.cssText = "color:#141414; font-weight:600;";
        const ownerSpan = document.createElement("span"); ownerSpan.textContent = t.owner || "-"; ownerSpan.style.cssText = "text-align:center; color:#555;";
        const dateSpan = document.createElement("span"); dateSpan.textContent = t.due_date || "-"; dateSpan.style.cssText = "text-align:center; color:#555;";
        const prioSpan = document.createElement("span"); prioSpan.textContent = PRIORITY_LABEL[t.priority] || t.priority || "-"; prioSpan.style.cssText = "text-align:center; color:#555;";

        row.appendChild(nameSpan); row.appendChild(ownerSpan); row.appendChild(dateSpan); row.appendChild(prioSpan);
        taskCard.appendChild(row);

        // 업무 상세 설명
        if (t.content) {
          const contentRow = document.createElement("div");
          contentRow.style.cssText = `padding:12px 20px 12px 36px; font-size:12px; color:#666; line-height:1.7; background:#F8F8F8; border-bottom:1px solid #D0D0D0;`;
          contentRow.textContent = t.content;
          taskCard.appendChild(contentRow);
        }
      });

      wrapper.appendChild(taskCard);
      document.body.appendChild(wrapper);

      const canvas = await html2canvas(wrapper, {
        scale: 2, useCORS: true, backgroundColor: "#ffffff",
        windowWidth: W, scrollX: 0, scrollY: 0,
      });
      document.body.removeChild(wrapper);

      const imgData = canvas.toDataURL("image/png");
      const pageW = 210;
      const pageH = Math.ceil(canvas.height * pageW / canvas.width);
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: [pageW, pageH] });
      pdf.addImage(imgData, "PNG", 0, 0, pageW, pageH);
      pdf.save("회의록.pdf");
    } catch {
      alert("PDF 생성에 실패했습니다.");
    } finally {
      setDownloading(false);
    }
  };

  const handleChatSend = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", text }]);
    setChatLoading(true);
    try {
      const res = await sendChatMessage(meetingId, text);
      setChatMessages(prev => [...prev, { role: "bot", text: res.answer }]);
    } catch {
      setChatMessages(prev => [...prev, { role: "bot", text: "답변을 가져오는 데 실패했습니다." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const removeRecipient = (userId: number) => {
    setRecipients(prev => prev.filter(r => r.user_id !== userId));
  };

  const handleEmailSend = () => {
    setEmailSending(true);
    setTimeout(() => {
      setEmailSending(false);
      setEmailSent(true);
    }, 700);
  };

  const transcript = getAllUtterances();

  return (
    <div className="max-w-6xl mx-auto w-full py-10 px-6">
      <h2 className="text-[22px] font-bold mb-6" style={{ color: "#141414" }}>
        {meeting.title}
      </h2>

      {/* 탭 바 */}
      <div className="flex border-b mb-6" style={{ borderColor: "#E6E1E6" }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-5 py-2.5 text-[14px] font-medium transition-colors"
            style={{
              color: tab === t.key ? "#623FB5" : "#969696",
              borderBottom: tab === t.key ? "2px solid #623FB5" : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 회의록 탭  */}
      {tab === "minutes" && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={handlePdfDownload}
              disabled={downloading}
              className="px-5 py-2 text-[13px] text-white rounded-lg disabled:opacity-60"
              style={{ backgroundColor: "#623FB5" }}
            >
              {downloading ? "생성 중..." : "PDF 다운로드"}
            </button>
          </div>

          {/* 회의록 카드 */}
          <div className="rounded-xl border mb-6" style={{ borderColor: "#E6E1E6" }}>
            <div className="px-6 py-4 border-b" style={{ borderColor: "#E6E1E6" }}>
              <span className="text-[15px] font-bold" style={{ color: "#141414" }}>회의록</span>
            </div>

            <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #E6E1E6" }}>
                  <td className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#555", backgroundColor: "#FAFAFA", width: "110px", borderRight: "1px solid #E6E1E6" }}>
                    회의 주제
                  </td>
                  <td className="px-5 py-3" style={{ color: "#141414" }} colSpan={3}>
                    {meeting.title}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #E6E1E6" }}>
                  <td className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#555", backgroundColor: "#FAFAFA", borderRight: "1px solid #E6E1E6" }}>
                    회의 일시
                  </td>
                  <td className="px-5 py-3" style={{ color: "#141414", borderRight: "1px solid #E6E1E6" }}>
                    {formatDate(meeting.meeting_at)}
                  </td>
                  <td className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#555", backgroundColor: "#FAFAFA", width: "80px", borderRight: "1px solid #E6E1E6" }}>
                    작성자
                  </td>
                  <td className="px-5 py-3" style={{ color: "#141414" }}>
                    {writer}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #E6E1E6" }}>
                  <td className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#555", backgroundColor: "#FAFAFA", borderRight: "1px solid #E6E1E6" }}>
                    회의 장소
                  </td>
                  <td className="px-5 py-3" style={{ color: "#141414" }} colSpan={3}>
                    {meeting.location || "-"}
                  </td>
                </tr>
                <tr>
                  <td className="px-5 py-3 font-medium whitespace-nowrap" style={{ color: "#555", backgroundColor: "#FAFAFA", borderRight: "1px solid #E6E1E6" }}>
                    참석자
                  </td>
                  <td className="px-5 py-3" style={{ color: "#141414" }} colSpan={3}>
                    {participantNames}
                  </td>
                </tr>
              </tbody>
            </table>

            {meeting.meeting_document && (
              <>
                <div className="px-5 py-3 text-center text-[13px] font-semibold" style={{ backgroundColor: "#F4F5F8", color: "#141414", borderTop: "1px solid #E6E1E6", borderBottom: "1px solid #E6E1E6" }}>
                  회의 내용
                </div>
                <div className="px-6 py-5">
                  <div className="rounded-lg px-5 py-4 text-[13px] whitespace-pre-line leading-relaxed" style={{ backgroundColor: "#F9F9FB", color: "#333" }}>
                    {meeting.meeting_document}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 업무 카드 */}
          <div className="rounded-xl border" style={{ borderColor: "#E6E1E6" }}>
            <div className="px-5 py-3 text-center text-[13px] font-semibold rounded-t-xl" style={{ backgroundColor: "#F4F5F8", color: "#141414", borderBottom: "1px solid #E6E1E6" }}>
              업무
            </div>
            {/* 헤더 */}
            <div className="grid text-[12px] font-semibold px-5 py-2.5" style={{ gridTemplateColumns: "1fr 120px 130px 100px", color: "#555", borderBottom: "1px solid #E6E1E6", backgroundColor: "#FAFAFA" }}>
              <span>업무명</span>
              <span className="text-center">담당자</span>
              <span className="text-center">기한</span>
              <span className="text-center">우선순위</span>
            </div>

            {tasks.map((task, idx) => (
              <div key={task.meeting_task_id} style={{ borderBottom: idx < tasks.length - 1 ? "1px solid #E6E1E6" : "none" }}>
                <div className="grid items-center px-5 py-3" style={{ gridTemplateColumns: "1fr 120px 130px 100px" }}>
                  {/* 접기/펼치기 버튼 */}
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      onClick={() => toggleExpand(task.meeting_task_id)}
                      style={{ color: "#623FB5", fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}
                    >
                      {expandedIds.has(task.meeting_task_id) ? "접기 ▲" : "펼치기 ▼"}
                    </button>
                    <span style={{ fontSize: "13px", color: "#141414" }}>{task.title}</span>
                  </div>
                  <span className="text-center text-[13px]" style={{ color: "#555" }}>{task.owner}</span>
                  <span className="text-center text-[13px]" style={{ color: "#555" }}>{task.due_date || "-"}</span>
                  <span className="text-center text-[13px]" style={{ color: "#555" }}>{PRIORITY_LABEL[task.priority] || task.priority}</span>
                </div>
                {expandedIds.has(task.meeting_task_id) && task.content && (
                  <div className="px-5 pb-3">
                    <div className="rounded-lg px-4 py-3 text-[13px] leading-relaxed" style={{ backgroundColor: "#F4F5F8", color: "#555" }}>
                      {task.content}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 녹음 원문 탭 */}
      {tab === "record" && (
        <div className="rounded-xl border" style={{ borderColor: "#E6E1E6" }}>
          <div className="px-6 py-4 border-b font-bold text-[15px]" style={{ borderColor: "#E6E1E6", color: "#141414" }}>
            녹음 원문
          </div>
          <div className="px-6 py-5 flex flex-col gap-4">
            {transcript.map((item, idx) => (
              <div key={idx} className="flex gap-3">
                <span className="text-[12px] font-medium whitespace-nowrap mt-0.5" style={{ color: "#969696", minWidth: "52px" }}>
                  {item.time}
                </span>
                <div className="flex-1">
                  <span className="text-[12px] font-semibold" style={{ color: "#623FB5" }}>
                    {item.speakerName}
                  </span>
                  <div className="mt-1 rounded-lg px-4 py-3 text-[13px] leading-relaxed" style={{ backgroundColor: "#F9F9FB", color: "#333" }}>
                    {item.content.join(" ")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 챗봇 내역 탭 */}
      {tab === "chatbot" && (
        <div className="rounded-xl border flex flex-col" style={{ borderColor: "#E6E1E6", height: "520px" }}>
          <div className="px-6 py-4 border-b font-bold text-[15px]" style={{ borderColor: "#E6E1E6", color: "#141414" }}>
            챗봇 내역
          </div>

          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[70%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed"
                  style={
                    msg.role === "user"
                      ? { backgroundColor: "#623FB5", color: "#fff" }
                      : { backgroundColor: "#F4F5F8", color: "#141414" }
                  }
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-2.5 text-[13px]" style={{ backgroundColor: "#F4F5F8", color: "#969696" }}>
                  답변 생성 중...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* 입력창 */}
          <div className="px-4 py-3 border-t flex gap-2" style={{ borderColor: "#E6E1E6" }}>
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleChatSend()}
              placeholder="회의 내용에 대해 질문하세요..."
              className="flex-1 border rounded-lg px-4 py-2 text-[13px] outline-none"
              style={{ borderColor: "#E6E1E6" }}
            />
            <button
              onClick={handleChatSend}
              disabled={chatLoading || !chatInput.trim()}
              className="px-4 py-2 text-[13px] text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: "#623FB5" }}
            >
              전송
            </button>
          </div>
        </div>
      )}

      {/* 회의 자료 탭 */}
      {tab === "material" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px]" style={{ color: "#969696" }}>회의의 준비 자료입니다.</p>
            <button
              onClick={async () => {
                const wrapper = document.createElement("div");
                wrapper.style.cssText = `position:absolute;top:-9999px;left:-9999px;width:700px;background:#fff;padding:48px;font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;box-sizing:border-box;color:#111;`;
                const titleEl = document.createElement("div");
                titleEl.style.cssText = `text-align:center;font-size:17px;font-weight:700;margin-bottom:24px;`;
                titleEl.textContent = "회의 준비 자료";
                wrapper.appendChild(titleEl);
                const agendaEl = document.createElement("div");
                agendaEl.style.cssText = `margin-bottom:20px;font-size:13px;line-height:1.9;`;
                agendaEl.innerHTML = `<b>기초안건</b><br/>${DUMMY_AGENDA.map((a,i) => `${i+1}. ${a}`).join("<br/>")}`;
                wrapper.appendChild(agendaEl);
                PREP_SECTIONS.forEach(s => {
                  const sec = document.createElement("div");
                  sec.style.cssText = `margin-bottom:16px;font-size:13px;line-height:1.9;`;
                  sec.innerHTML = `<b>${s.label}</b><br/><span style="white-space:pre-wrap">${s.value}</span>`;
                  wrapper.appendChild(sec);
                });
                document.body.appendChild(wrapper);
                const canvas = await html2canvas(wrapper, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
                document.body.removeChild(wrapper);
                const imgData = canvas.toDataURL("image/png");
                const pageW = 210;
                const pageH = Math.ceil(canvas.height * pageW / canvas.width);
                const pdf = new jsPDF({ orientation: "p", unit: "mm", format: [pageW, pageH] });
                pdf.addImage(imgData, "PNG", 0, 0, pageW, pageH);
                pdf.save("회의_준비_자료.pdf");
              }}
              className="px-5 py-2 text-[13px] text-white rounded-lg"
              style={{ backgroundColor: "#623FB5" }}
            >
              PDF 다운로드
            </button>
          </div>

          {/* 기초안건 */}
          <div className="mb-5">
            <p className="text-[14px] font-bold mb-2" style={{ color: "#141414" }}>기초 안건</p>
            <div className="rounded-xl px-5 py-4 text-[13px]" style={{ backgroundColor: "#F4F5F8", color: "#141414" }}>
              {DUMMY_AGENDA.map((a, i) => (
                <p key={i} className="leading-relaxed">{i + 1}. {a}</p>
              ))}
            </div>
          </div>

          {/* 준비자료 섹션들 */}
          <div className="space-y-5">
            {PREP_SECTIONS.map(section => (
              <div key={section.label}>
                <p className="text-[14px] font-bold mb-2" style={{ color: "#141414" }}>{section.label}</p>
                <div className="border rounded-xl px-5 py-4 text-[13px] whitespace-pre-line leading-relaxed" style={{ borderColor: "#E6E1E6", color: "#333" }}>
                  {section.value}
                </div>
              </div>
            ))}

            <div>
              <p className="text-[14px] font-bold mb-2" style={{ color: "#141414" }}>참고 자료</p>
              <div className="border rounded-xl px-5 py-3 space-y-1" style={{ borderColor: "#E6E1E6" }}>
                {PREP_REFERENCES.map((ref, i) => (
                  <p key={i} className="text-[13px]">
                    <span style={{ color: "#141414" }}>- {ref} </span>
                    <span className="cursor-pointer hover:underline" style={{ color: "#623FB5" }}>더보기</span>
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 이메일 발송 탭 */}
      {tab === "email" && (
        <div>
          <p className="text-[13px] mb-4" style={{ color: "#969696" }}>요약 이메일입니다.</p>

          {emailSent ? (
            <div className="flex items-center justify-center py-20 text-[14px] font-medium" style={{ color: "#623FB5" }}>
              ✅ 메일이 발송되었습니다.
            </div>
          ) : (
            <>
              <div className="flex gap-5">
                {/* 왼쪽: 회의 정보 */}
                <div className="flex-1 flex flex-col gap-4">
                  {/* 회의 제목 */}
                  <div className="rounded-xl border p-5" style={{ borderColor: "#E6E1E6" }}>
                    <p className="text-[12px] mb-1" style={{ color: "#969696" }}>회의 제목(수정 불가)</p>
                    <p className="text-[14px] font-medium" style={{ color: "#141414" }}>{meeting.title}</p>
                  </div>

                  {/* 회의 정보 */}
                  <div className="rounded-xl border" style={{ borderColor: "#E6E1E6" }}>
                    <p className="px-5 pt-4 pb-2 text-[13px] font-bold" style={{ color: "#141414" }}>회의 정보</p>
                    <div className="px-5 pb-4 flex flex-col gap-2 text-[13px]">
                      <div className="flex gap-3">
                        <span style={{ color: "#969696", minWidth: "70px" }}>회의 일시</span>
                        <span style={{ color: "#141414" }}>{formatDate(meeting.meeting_at)}</span>
                      </div>
                      <div className="flex gap-3">
                        <span style={{ color: "#969696", minWidth: "70px" }}>회의 참석자</span>
                        <span style={{ color: "#141414" }}>{participantNames}</span>
                      </div>
                    </div>
                  </div>

                  {/* 부여된 태스크 */}
                  <div className="rounded-xl border" style={{ borderColor: "#E6E1E6" }}>
                    <p className="px-5 pt-4 pb-2 text-[13px] font-bold" style={{ color: "#141414" }}>부여된 태스크</p>
                    <table className="w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#F4F5F8", borderTop: "1px solid #E6E1E6", borderBottom: "1px solid #E6E1E6" }}>
                          <th className="px-4 py-2.5 text-left font-medium" style={{ color: "#555" }}>태스크</th>
                          <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap" style={{ color: "#555", width: "80px" }}>담당자</th>
                          <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap" style={{ color: "#555", width: "100px" }}>기한</th>
                          <th className="px-4 py-2.5 text-left font-medium whitespace-nowrap" style={{ color: "#555", width: "70px" }}>우선순위</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((task, idx) => (
                          <tr key={task.meeting_task_id} style={{ borderBottom: idx < tasks.length - 1 ? "1px solid #E6E1E6" : "none" }}>
                            <td className="px-4 py-3" style={{ color: "#141414" }}>{task.title}</td>
                            <td className="px-4 py-3 whitespace-nowrap" style={{ color: "#555" }}>{task.owner || "미배정"}</td>
                            <td className="px-4 py-3 whitespace-nowrap" style={{ color: "#555" }}>{task.due_date || "-"}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full text-[11px]" style={{ backgroundColor: "#F2F0FF", color: "#623FB5" }}>
                                {PRIORITY_LABEL[task.priority] || task.priority}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* 이메일 수신자 */}
                  <div className="rounded-xl border p-4" style={{ borderColor: "#E6E1E6" }}>
                    <p className="text-[13px] font-bold mb-3" style={{ color: "#141414" }}>이메일 수신자</p>
                    <div className="flex flex-wrap gap-2">
                      {recipients.map(r => (
                        <span
                          key={r.user_id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px]"
                          style={{ backgroundColor: "#F4F5F8", color: "#141414", border: "1px solid #E6E1E6" }}
                        >
                          {r.name}
                          <button onClick={() => removeRecipient(r.user_id)} style={{ color: "#969696" }}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 이메일 미리보기 */}
                <div className="w-[440px] flex-shrink-0">
                  <p className="text-[14px] font-bold mb-3" style={{ color: "#141414" }}>이메일 미리보기</p>
                  <div className="rounded-xl border px-6 py-5 text-[13px] leading-relaxed" style={{ borderColor: "#E6E1E6", color: "#333" }}>
                    <p className="mb-4">안녕하세요, OOO.</p>
                    <p className="mb-4">회의록이 확정되었습니다. 아래 태스크가 회원님께 부여되었으니 기한 내에 처리해 주세요.</p>
                    <p className="font-bold mb-1">[회의 정보]</p>
                    <p>• 회의 제목: {meeting.title}</p>
                    <p className="mb-4">• 회의 일시: {formatDate(meeting.meeting_at)}</p>
                    <p className="font-bold mb-1">[부여된 태스크]</p>
                    {tasks.map((task, i) => (
                      <p key={task.meeting_task_id}>
                        {i + 1}. {task.title} (담당자: {task.owner}, 기한: {task.due_date || "-"}, 우선순위: {PRIORITY_LABEL[task.priority] || task.priority})
                      </p>
                    ))}
                    <p className="mt-4">프로젝트에서 더 자세한 내용을 확인하실 수 있습니다.</p>
                    <p>감사합니다.</p>
                  </div>
                </div>
              </div>

              {/* 발송 버튼 */}
              <div className="flex justify-end mt-5">
                <button
                  onClick={handleEmailSend}
                  disabled={emailSending || recipients.length === 0}
                  className="px-8 py-3 text-[14px] text-white rounded-lg font-semibold disabled:opacity-50"
                  style={{ backgroundColor: "#623FB5" }}
                >
                  {emailSending ? "발송 중..." : "이메일 발송"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
