import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getAgendaList, saveAgendaList, confirmAgenda } from "../../services/meeting";

interface AgendaItem {
  content: string;
  reason: string;
  checked: boolean;
}

export default function AgendaCreatePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const meetingId = Number(id);
  const { showPrepMaterial = false } =
    (location.state as { showAgenda?: boolean; showPrepMaterial?: boolean }) ?? {};

  const [items, setItems] = useState<AgendaItem[]>([
    { content: "", reason: "", checked: false },
    { content: "", reason: "", checked: false },
    { content: "", reason: "", checked: false },
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getAgendaList(meetingId)
      .then(list => {
        if (list.length > 0) {
          setItems(list.map(item => ({ content: item.content, reason: item.reason, checked: false })));
        }
      })
      .catch(() => {});
  }, [meetingId]);

  const toggleCheck = (idx: number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      if (!item.checked && item.content.trim() === "") return item;
      return { ...item, checked: !item.checked };
    }));
  };

  const updateContent = (idx: number, value: string) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, content: value } : item
    ));
  };

  const canSubmit = items.some(item => item.checked && item.content.trim() !== "");

  const handleNext = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const selected = items.filter(item => item.checked);
      await saveAgendaList(meetingId, selected.map(item => ({ title: item.content, reason: item.reason })));
      await confirmAgenda(meetingId);
      navigate(`/meetings/${meetingId}/prep-material`, {
        state: { showAgenda: true, showPrepMaterial },
      });
    } catch (error) {
      const message =
        (error as { response?: { data?: { error?: string } } }).response?.data?.error ||
        "기초안건 저장에 실패했습니다.";
      alert(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full py-10 px-6">
      <h2 className="text-[24px] font-bold text-[#141414] mb-2">기초 안건</h2>
      <p className="text-[12px] text-[#969696] mb-8">
        회의에 필요한 기초안건입니다. 이메일 전송 및 준비자료 생성에 사용됩니다.
      </p>

      <div className="bg-[#F4F5F8] rounded-[12px] border border-[#E6E1E6] p-6 flex flex-col gap-4">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="bg-white rounded-xl p-5 border border-[#E6E1E6] flex items-center gap-4"
          >
            <div className="flex-1">
              <p className="text-[13px] text-[#141414] font-medium mb-2">기초안건 {idx + 1}</p>
              <input
                type="text"
                value={item.content}
                onChange={e => updateContent(idx, e.target.value)}
                placeholder="안건 내용을 입력하세요"
                className="w-full border border-[#E6E1E6] rounded-lg px-4 py-2.5 text-[14px] text-[#141414] outline-none focus:border-[#623FB5] transition"
              />
            </div>
            <button
              type="button"
              onClick={() => toggleCheck(idx)}
              className="flex-shrink-0 transition"
            >
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                <circle
                  cx="10" cy="10" r="9"
                  fill={item.checked ? "#623FB5" : "none"}
                  stroke={item.checked ? "#623FB5" : "#D1D5DB"}
                  strokeWidth="1.5"
                />
                <path
                  d="M6 10.5l2.5 2.5 5.5-5.5"
                  stroke={item.checked ? "#ffffff" : "#D1D5DB"}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={handleNext}
          disabled={!canSubmit || submitting}
          className="px-8 py-2.5 text-white text-[14px] rounded-lg transition"
          style={{
            backgroundColor: canSubmit ? "#623FB5" : "#969696",
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {submitting ? "저장 중..." : "다음"}
        </button>
      </div>
    </div>
  );
}
