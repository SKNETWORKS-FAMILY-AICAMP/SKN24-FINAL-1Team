import { useRef, useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { getPrepMaterial, savePrepMaterial, generatePrepMaterial } from "../../services/meeting";

const MAX = { purpose: 500, currentState: 1000, regulations: 1000, expected: 500 };

// 더미 데이터 (에러 시 폴백용)
const DUMMY = {
  purpose:
    "- 상반기 채용 진행 상황 공유\n- 신규 입사자 온보딩 현황 공유\n- 조직 개편 현황 공유\n- 직원 만족도 조사 결과 공유\n- 채용 프로세스 개선 방안 논의\n- 온보딩 자료 개선 방안 논의\n- 유연근무제 확대, 복지 포인트 확대 등 논의\n- 리더십 교육, 신규 입사자 멘토 제도 재운영 검토",
  currentState:
    "채용 현황\n- 현재 지원자 수는 전체 기준 130명이며, 개발팀 특히 백엔드 지원자가 많음.\n- 프로젝트 경험은 적게 있지만 협업 경험 설명이 부족한 지원자가 다수 존재.\n- 기술 면접 외에 협업 경험, 문제 해결 방식 등의 확인 필요.\n- 1차 온라인 면접, 최종 오프라인 면접 진행 방향으로 재정리.\n신규 입사자 온보딩\n- 기존 온보딩 자료가 막연하다는 피드백이 다수 존재.\n- 회사 분위기, 업무 흐름 등 신규 입사자의 궁금증 해소 필요.\n- 협업 툴(슬랙, 노션, 지라) 사용법 포함 및 FAQ 문서 별도 제작 검토.\n조직 개편\n- 데이터팀/서비스팀 재배치 등 기능 중심 조직으로 일부 변경 검토.\n- 디자인팀도 서비스 단위 조직 논의 중.\n- 중복 회의 감소를 위한 회의 체계 정리 필요 (회의 전 안건 정리 및 공유 문화 정착, 회의 목적 명확화).\n직원 만족도\n- 유연근무제 확대 요구 다수 (팀별 특성을 고려해 유연하게 운영 검토).\n- 복지 포인트 사용 항목 확대 (운동, 자기개발 지원).",
  regulations:
    "임금피크제 운영지침 (2025.12.04 개정)\n- 별도직무표에 따른 직무 수행 가능.\n- 경영지원관: 직원 채용 면접 진행.\n- 정책연구관: 신규사업 발굴 연구 수행.\n- 사내교수: 업무매뉴얼 작성 및 부서 간 협업 과제 추진.\n직제규칙 (2026.04.30 개정)\n- 인사총무팀에서 인력 채용 및 배치, 직원 역량 개발 및 교육 훈련 담당.\n직원 채용 지침 (2025.12.04 개정)\n- 지원자의 발표 자료 작성, 발표 및 질의응답으로 진행하며 평가.",
  expected:
    "- 채용 프로세스 개선 방안 확정\n- 온보딩 자료 개선 방향 결정\n- 유연근무제 확대 및 복지 개선 방안 합의\n- 리더십 교육 및 멘토 제도 재운영 계획 수립",
  references: [
    { label: "프로젝트 히스토리", link: "#" },
    { label: "내부 문서 (임금피크제 운영지침, 직제규칙, 직원 채용 지침)", link: "#" },
  ],
};

export default function PrepMaterialPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const meetingId = Number(id);

  const contentRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [purpose, setPurpose] = useState("");
  const [currentState, setCurrentState] = useState("");
  const [regulations, setRegulations] = useState("");
  const [expected, setExpected] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    const loadData = async () => {
      try {
        const prep = await getPrepMaterial(meetingId);
        if (active) {
          if (prep.purpose || prep.project_status || prep.rule || prep.effect) {
            setPurpose(prep.purpose || "");
            setCurrentState(prep.project_status || "");
            setRegulations(prep.rule || "");
            setExpected(prep.effect || "");
            setLoading(false);
          } else {
            const generated = await generatePrepMaterial(meetingId);
            if (active) {
              setPurpose(generated.purpose || "");
              setCurrentState(generated.project_status || "");
              setRegulations(generated.rule || "");
              setExpected(generated.effect || "");
              setLoading(false);
            }
          }
        }
      } catch (err) {
        console.error("준비자료 로드/생성 실패:", err);
        if (active) {
          setPurpose(DUMMY.purpose);
          setCurrentState(DUMMY.currentState);
          setRegulations(DUMMY.regulations);
          setExpected(DUMMY.expected);
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [meetingId]);

  const handleSave = async () => {
    try {
      await savePrepMaterial(meetingId, {
        purpose,
        project_status: currentState,
        rule: regulations,
        effect: expected,
      });
    } catch (err) {
      console.error("저장 실패:", err);
    }
  };

  const handlePdfDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const sections = [
        { label: "회의 목적", value: purpose },
        { label: "프로젝트 현재 상태", value: currentState },
        { label: "관련 규정 및 제약사항", value: regulations },
        { label: "회의 종료 후 기대 결과", value: expected },
        { label: "참조 문서 목록", value: DUMMY.references.map(r => `- ${r.label}`).join("\n") },
      ];

      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        position:absolute; top:-9999px; left:-9999px;
        width:700px; background:#fff;
        padding:48px 48px 60px;
        font-family:'Malgun Gothic','Apple SD Gothic Neo',sans-serif;
        box-sizing:border-box; color:#111;
      `;

      // 제목
      const title = document.createElement("div");
      title.style.cssText = `
        text-align:center; font-size:17px; font-weight:700;
        margin-bottom:24px;
      `;
      title.textContent = "회의 준비 자료";
      wrapper.appendChild(title);

      // 표 컨테이너 
      const outer = document.createElement("div");
      outer.style.cssText = `width:100%;`;

      sections.forEach(({ label, value }, idx) => {
        const isFirst = idx === 0;

        // 섹션 헤더
        const header = document.createElement("div");
        header.style.cssText = `
          padding:10px 10px 20px;
          text-align:center;
          line-height:1.3;
          font-size:13px; font-weight:600;
          border-left:1px solid #000;
          border-right:1px solid #000;
          border-top:${isFirst ? "1px solid #000" : "none"};
          border-bottom:1px solid #000;
          box-sizing:border-box;
        `;
        header.textContent = label;
        outer.appendChild(header);

        // 내용 행
        const content = document.createElement("div");
        content.style.cssText = `
          padding:14px 18px;
          font-size:12px; line-height:1.9;
          white-space:pre-wrap; word-break:break-word;
          min-height:60px;
          border-left:1px solid #000;
          border-right:1px solid #000;
          border-top:none;
          border-bottom:1px solid #000;
          box-sizing:border-box;
        `;
        content.textContent = value;
        outer.appendChild(content);
      });

      wrapper.appendChild(outer);
      document.body.appendChild(wrapper);

      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: 700,
        scrollX: 0,
        scrollY: 0,
      });
      document.body.removeChild(wrapper);

      const imgData = canvas.toDataURL("image/png");
      const pageW = 210;
      const pageH = Math.ceil(canvas.height * pageW / canvas.width);
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: [pageW, pageH] });
      pdf.addImage(imgData, "PNG", 0, 0, pageW, pageH);
      pdf.save("회의_준비_자료.pdf");
    } catch (e) {
      console.error("PDF 생성 실패:", e);
      alert("PDF 생성에 실패했습니다.");
    } finally {
      setDownloading(false);
    }
  };

  const sections = [
    { label: "회의 목적", value: purpose, onChange: setPurpose, max: MAX.purpose },
    { label: "프로젝트 현재 상태", value: currentState, onChange: setCurrentState, max: MAX.currentState },
    { label: "관련 규정 및 제약사항", value: regulations, onChange: setRegulations, max: MAX.regulations },
    { label: "회의 종료 후 기대 결과", value: expected, onChange: setExpected, max: MAX.expected },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-10 px-6">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-[#623FB5]/20 animate-ping"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-[#623FB5] border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        </div>
        <h3 className="text-lg font-bold text-[#141414] mb-2">회의 준비 자료 생성 중</h3>
        <p className="text-xs text-[#969696] text-center max-w-sm">
          RunPod AI와 내부 문서를 기반으로 프로젝트 컨텍스트를 파악하여 회의 준비 자료를 자동 생성하고 있습니다. 잠시만 기다려 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full py-10 px-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-[24px] font-bold text-[#141414] mb-1">회의 준비 자료 생성</h2>
          <p className="text-[12px] text-[#969696]">회의 준비에 참조할 수 있는 자료입니다.</p>
        </div>
        <div className="flex gap-2 mt-1">
          <button
            onClick={async () => {
              if (isEditing) {
                await handleSave();
              }
              setIsEditing(v => !v);
            }}
            className="px-4 py-2 text-[13px] rounded-lg border transition"
            style={isEditing
              ? { backgroundColor: "#623FB5", color: "#ffffff", borderColor: "#623FB5" }
              : { backgroundColor: "#ffffff", color: "#141414", borderColor: "#E6E1E6" }
            }
          >
            {isEditing ? "완료" : "수정하기"}
          </button>
          <button
            onClick={handlePdfDownload}
            disabled={downloading}
            className="px-4 py-2 text-[13px] text-white rounded-lg transition disabled:opacity-60"
            style={{ backgroundColor: "#623FB5" }}
          >
            {downloading ? "생성 중..." : "pdf 다운로드"}
          </button>
        </div>
      </div>

      {/* 편집 가능 섹션들 */}
      <div ref={contentRef} className="space-y-6">
        {sections.map(({ label, value, onChange, max }) => (
          <div key={label}>
            <p className="text-[14px] text-[#141414] font-bold mb-2">{label}</p>
            <div className="relative">
              <textarea
                value={value}
                onChange={e => isEditing && onChange(e.target.value.slice(0, max))}
                readOnly={!isEditing}
                rows={label === "프로젝트 현재 상태" || label === "관련 규정 및 제약사항" ? 10 : 6}
                className="w-full border border-[#E6E1E6] rounded-xl px-4 py-3 text-[13px] text-[#141414] resize-none outline-none transition bg-white"
                style={{ cursor: isEditing ? "text" : "default", borderColor: isEditing ? undefined : "#E6E1E6" }}
              />
              <span className="absolute bottom-3 right-4 text-[11px] text-[#969696]">
                {value.length}/{max}
              </span>
            </div>
          </div>
        ))}

        {/* 참조 문서 목록*/}
        <div>
          <p className="text-[14px] text-[#141414] font-bold mb-2">참조 문서 목록</p>
          <div className="border border-[#E6E1E6] rounded-xl px-4 py-3 bg-white space-y-1">
            {DUMMY.references.map((ref, i) => (
              <p key={i} className="text-[13px]">
                <span className="text-[#141414]">- {ref.label} </span>
                <span className="text-[#623FB5] hover:underline cursor-pointer">더보기</span>
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* 다음 버튼 */}
      <div className="flex justify-end mt-8">
        <button
          onClick={async () => {
            await handleSave();
            navigate(`/meetings/${meetingId}/complete`);
          }}
          className="px-8 py-2.5 text-white text-[14px] rounded-lg transition"
          style={{ backgroundColor: "#623FB5" }}
        >
          다음
        </button>
      </div>
    </div>
  );
}
