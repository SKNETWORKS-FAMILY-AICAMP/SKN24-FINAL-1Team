import { useNavigate, useParams } from "react-router-dom";

export default function MeetingCompletePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const meetingId = Number(id);

  return (
    <div
      className="max-w-4xl mx-auto w-full px-6 flex flex-col items-center justify-center"
      style={{ minHeight: "70vh" }}
    >
      <h1 className="text-[28px] font-bold text-[#141414] mb-3">회의 생성 완료</h1>
      <p className="text-[15px] text-[#969696] mb-14">팀원들에게 회의를 공유하시겠습니까?</p>

      {/* 보라색 체크 원형 아이콘 */}
      <div
        className="flex items-center justify-center rounded-full mb-16"
        style={{ width: 128, height: 128, backgroundColor: "#C4B5F5" }}
      >
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
          <path
            d="M14 28L24 38L42 18"
            stroke="#ffffff"
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* 버튼 */}
      <div className="flex gap-4">
        <button
          onClick={() => navigate("/meetings")}
          className="px-12 py-3.5 text-[15px] font-semibold rounded-lg transition hover:opacity-90"
          style={{ backgroundColor: "#C4B5F5", color: "#ffffff" }}
        >
          건너뛰기
        </button>
        <button
          onClick={() => navigate(`/meetings/${meetingId}/invite-email`)}
          className="px-12 py-3.5 text-[15px] font-semibold rounded-lg transition hover:opacity-90"
          style={{ backgroundColor: "#623FB5", color: "#ffffff" }}
        >
          확인
        </button>
      </div>
    </div>
  );
}
