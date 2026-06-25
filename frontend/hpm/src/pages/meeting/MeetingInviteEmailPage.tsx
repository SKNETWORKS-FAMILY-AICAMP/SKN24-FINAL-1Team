import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getMeetingDetail } from "../../services/meeting";

const MAX_GREETING = 200;

export default function MeetingInviteEmailPage() {
  const { id } = useParams();
  const meetingId = Number(id);
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<{ title: string; meeting_at: string; location: string } | null>(null);
  const [recipients, setRecipients] = useState<{ id: string; label: string }[]>([]);
  const [greeting, setGreeting] = useState(
    "안녕하세요.\n아래와 같이 회의를 진행하고자 하오니 참석 부탁드립니다.\n감사합니다."
  );
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getMeetingDetail(meetingId).then((m) => {
      setMeeting({ title: m.title, meeting_at: m.meeting_at, location: m.location });
      if (m.participants?.length) {
        setRecipients(m.participants.map((p) => ({ id: String(p.user_id), label: p.name })));
      }
    }).catch(() => {});
  }, [meetingId]);

  const removeRecipient = (id: string) =>
    setRecipients((prev) => prev.filter((r) => r.id !== id));

  const handleSend = () => {
    if (sending) return;
    setSending(true);
    setTimeout(() => {
      navigate("/meetings");
    }, 600);
  };

  const recipientNames = recipients.map((r) => r.label).join(", ") || "수신자 없음";

  return (
    <div className="max-w-5xl mx-auto w-full py-10 px-6">
      {/* 헤더 */}
      <h2 className="text-[24px] font-bold text-[#141414] mb-1">이메일 확인</h2>
      <p className="text-[12px] text-[#969696] mb-8">발송 전 이메일을 확인해주세요</p>

      {/* 본문*/}
      <div className="flex gap-6 items-start">
        {/* 왼쪽 카드 */}
        <div className="flex-1 min-w-0 bg-white border border-[#E6E1E6] rounded-2xl p-6 flex flex-col gap-6">
          {/* 회의 제목 */}
          <div>
            <p className="text-[13px] font-bold text-[#141414] mb-2">
              회의 제목<span className="text-[12px] font-normal text-[#969696] ml-1">(수정 불가)</span>
            </p>
            <p className="text-[14px] text-[#141414]">{meeting?.title ?? ""}</p>
          </div>

          {/* 회의 정보 */}
          <div>
            <p className="text-[13px] font-bold text-[#141414] mb-3">회의 정보</p>
            <div className="flex flex-col gap-2">
              <div className="flex gap-4">
                <span className="text-[13px] text-[#969696] w-20 flex-shrink-0">회의 일시</span>
                <span className="text-[13px] text-[#141414]">{meeting?.meeting_at ?? ""}</span>
              </div>
              <div className="flex gap-4">
                <span className="text-[13px] text-[#969696] w-20 flex-shrink-0">회의 장소</span>
                <span className="text-[13px] text-[#141414]">{meeting?.location ?? ""}</span>
              </div>
            </div>
          </div>

          {/* 인사말 */}
          <div>
            <p className="text-[13px] font-bold text-[#141414] mb-2">인사말(이메일 본문)</p>
            <div className="relative">
              <textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value.slice(0, MAX_GREETING))}
                rows={4}
                className="w-full border border-[#E6E1E6] rounded-xl px-4 py-3 text-[13px] text-[#141414] resize-none outline-none focus:border-[#623FB5] transition"
              />
              <span className="absolute bottom-3 right-4 text-[11px] text-[#969696]">
                {greeting.length}/{MAX_GREETING}
              </span>
            </div>
          </div>

          {/* 메일 수신자 */}
          <div>
            <p className="text-[13px] font-bold text-[#141414] mb-2">메일 수신자</p>
            <div className="min-h-[48px] border border-[#E6E1E6] rounded-xl px-3 py-2.5 flex flex-wrap gap-2">
              {recipients.map((r) => (
                <span
                  key={r.id}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[12px] text-[#141414]"
                  style={{ backgroundColor: "#F4F5F8", border: "1px solid #E6E1E6" }}
                >
                  {r.label}
                  <button
                    type="button"
                    onClick={() => removeRecipient(r.id)}
                    className="text-[#969696] hover:text-[#141414] leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 오른쪽 이메일 미리보기 카드 */}
        <div className="w-[380px] flex-shrink-0 bg-white border border-[#E6E1E6] rounded-2xl p-6 overflow-hidden">
          <p className="text-[16px] font-bold text-[#141414] mb-5">이메일 미리보기</p>
          <div className="text-[13px] text-[#141414] leading-relaxed space-y-4 break-words">
            <p style={{ whiteSpace: "pre-line" }}>{greeting}</p>
            <p>일정 : {meeting?.meeting_at ?? ""}</p>
            <p>장소 : {meeting?.location ?? ""}</p>
            <p>참여자 : {recipientNames}</p>
          </div>
        </div>
      </div>

      {/* 이메일 발송 버튼 */}
      <div className="flex justify-end mt-8">
        <button
          onClick={handleSend}
          disabled={sending}
          className="px-8 py-3 text-white text-[14px] font-semibold rounded-xl transition hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: "#623FB5" }}
        >
          {sending ? "발송 중..." : "이메일 발송"}
        </button>
      </div>
    </div>
  );
}