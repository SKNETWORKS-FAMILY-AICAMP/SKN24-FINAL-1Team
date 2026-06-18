import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createMeeting, saveAgendaList, confirmAgenda, getUserList, generateAgendaWithOcr } from "../../features/meeting/api";
import { useAuth } from "../../context/AuthContext";

const STEPS = ["주제 입력", "외부 요청 자료", "기초 안건", "이메일 발송"];

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-start justify-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex flex-col items-center" style={{ minWidth: 100 }}>
          <div className="flex items-center w-full">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 z-10
              ${i < current ? "bg-[#F5A623] text-white" : i === current ? "bg-[#F5A623] text-white ring-2 ring-[#F5A623]/40" : "bg-gray-200 text-gray-400"}`}>
              {i < current ? "✓" : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 ${i < current ? "bg-[#F5A623]" : "bg-gray-200"}`} />
            )}
          </div>
          <span className={`text-xs mt-1.5 text-center ${i === current ? "text-[#F5A623] font-semibold" : "text-gray-400"}`}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

interface UserOption { users_id: number; name: string; email: string; }
interface AgendaItem { id: number; title: string; reason: string; }

export default function MeetingCreatePage() {
  const navigate = useNavigate();
  const { projectId } = useAuth();  // ← 추가
  const [step, setStep] = useState(0);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [createdMeetingId, setCreatedMeetingId] = useState<number | null>(null);

  // Step 0
  const [title, setTitle] = useState("");
  const [meetingAt, setMeetingAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [location, setLocation] = useState("");
  const [participants, setParticipants] = useState<number[]>([]);

  // Step 1
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Step 2
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [agendaConfirmed, setAgendaConfirmed] = useState(false);

  // Step 3
  const [emailTargets, setEmailTargets] = useState<number[]>([]);
  const [emailSent, setEmailSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getUserList().then(list => {
      setUsers(list);
      if (list.length > 0) setParticipants([list[0].users_id]);
    }).catch(console.error);
  }, []);

  const toggleParticipant = (id: number) => {
    if (participants.length === 1 && participants.includes(id)) return;
    setParticipants(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const generateAgenda = async () => {
  if (!createdMeetingId) return;
  setGenerating(true);
  try {
    const res = await generateAgendaWithOcr(createdMeetingId, uploadedFile);
    setAgenda(
      res.agenda.map((a: any, i: number) => ({
        id: i + 1,
        title: a.content,
        reason: a.reason,
      }))
    );
  } catch (e) {
    console.error(e);
    alert("안건 생성에 실패했습니다.");
  } finally {
    setGenerating(false);
  }
};

  const handleConfirmAgenda = async () => {
    if (!createdMeetingId) return;
    try {
      await saveAgendaList(createdMeetingId, agenda.map(a => ({ title: a.title, reason: a.reason })));
      await confirmAgenda(createdMeetingId);
      setAgendaConfirmed(true);
    } catch (e) {
      console.error(e);
      setAgendaConfirmed(true);
    }
  };

  const handleNextFromStep0 = async () => {
    setSubmitting(true);
    try {
      const meeting = await createMeeting({
        project_id: projectId ?? 1,  // ← 수정
        title,
        location,
        meeting_at: meetingAt,
        end_at: endAt,
        participants,
      });
      setCreatedMeetingId(meeting.meeting_id);
      setStep(1);
    } catch (e) {
      alert("회의 생성에 실패했습니다.");
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    navigate("/meeting");
  };

  const canNext0 = title.trim().length >= 1 && meetingAt && participants.length >= 2;

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold text-gray-900 mb-6">회의 등록</h1>
      <StepBar current={step} />

      <div className="bg-white rounded-xl shadow-sm p-8 max-w-2xl mx-auto">

        {/* STEP 0 */}
        {step === 0 && (
          <div>
            <h2 className="text-lg font-bold mb-1">회의 기본 정보</h2>
            <p className="text-sm text-gray-400 mb-6">회의 주제와 일정을 입력해주세요</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                회의 주제 <span className="text-red-500">*</span>
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={30}
                placeholder="예: 2025 Q3 제품 로드맵 검토"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#F5A623] transition"
              />
              <p className="text-xs text-gray-400 text-right mt-1">{title.length}/30</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시작 일시 <span className="text-red-500">*</span></label>
                <input type="datetime-local" value={meetingAt} onChange={e => setMeetingAt(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#F5A623]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">종료 일시</label>
                <input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#F5A623]" />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">장소</label>
              <input value={location} onChange={e => setLocation(e.target.value)} maxLength={50}
                placeholder="예: 3층 대회의실"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#F5A623]" />
            </div>

            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                참여자 선택 <span className="text-red-500">*</span> <span className="text-gray-400 font-normal">(최소 2명)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {users.map(u => (
                  <button
                    key={u.users_id}
                    type="button"
                    onClick={() => toggleParticipant(u.users_id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition
                      ${participants.includes(u.users_id)
                        ? "bg-[#FFF3DC] border-[#F5A623] text-[#F5A623] font-medium"
                        : "border-gray-200 text-gray-600 hover:border-[#F5A623]"
                      }`}
                  >
                    {u.name}
                    {participants.includes(u.users_id) && <span className="ml-1 text-xs">×</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold mb-1">외부 요청 자료</h2>
            <p className="text-sm text-gray-400 mb-6">회의에 필요한 자료를 업로드해주세요.</p>
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center bg-gray-50"
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setUploadedFile(f); }}
            >
              {uploadedFile ? (
                <div className="flex flex-col items-center gap-3">
                  <span className="text-4xl">📄</span>
                  <p className="font-medium text-gray-800">{uploadedFile.name}</p>
                  <p className="text-xs text-gray-400">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                  <button onClick={() => setUploadedFile(null)} className="text-sm text-red-400 hover:underline">제거</button>
                </div>
              ) : (
                <>
                  <p className="text-3xl mb-3">⬇️</p>
                  <p className="font-medium text-gray-600 mb-1">파일을 드래그하거나 클릭하여 업로드</p>
                  <p className="text-xs text-gray-400 mb-4">JPG · JPEG · PNG · PDF · 최대 10MB</p>
                  <label className="inline-block bg-[#F5A623] text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer hover:bg-[#e8951a]">
                    파일 선택
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) setUploadedFile(f); }} />
                  </label>
                </>
              )}
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold mb-1">기초 안건 생성</h2>
            <p className="text-sm text-gray-400 mb-6">AI가 회의 정보를 분석하여 기초 안건을 생성합니다.</p>

            {agenda.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-10 text-center">
                <p className="text-4xl mb-3">🤖</p>
                <p className="font-medium text-gray-700 mb-2">AI 기초 안건을 생성하시겠습니까?</p>
                <button
                  onClick={generateAgenda}
                  disabled={generating}
                  className="bg-[#F5A623] text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-[#e8951a] disabled:opacity-60"
                >
                  {generating ? "생성 중..." : "AI 안건 생성"}
                </button>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${agendaConfirmed ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                    {agendaConfirmed ? "✓ 확정됨" : "✓ 수정 가능"}
                  </span>
                </div>
                {agenda.map((item, i) => (
                  <div key={item.id} className="flex gap-3 mb-3 p-4 border border-gray-100 rounded-xl bg-white">
                    <div className="w-7 h-7 rounded-full bg-[#F5A623] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <input
                        value={item.title}
                        disabled={agendaConfirmed}
                        onChange={e => setAgenda(agenda.map((a, idx) => idx === i ? { ...a, title: e.target.value } : a))}
                        className="w-full font-medium text-sm bg-transparent outline-none border-b border-transparent focus:border-[#F5A623] mb-2 disabled:cursor-default"
                      />
                      <p className="text-xs text-gray-400">
                        <span className="text-[#F5A623] font-semibold">반영 근거</span> {item.reason}
                      </p>
                    </div>
                  </div>
                ))}
                {!agendaConfirmed && (
                  <button
                    onClick={() => setAgenda([...agenda, { id: Date.now(), title: "새 안건", reason: "" }])}
                    className="w-full border border-dashed border-gray-200 rounded-xl py-3 text-gray-400 text-sm hover:border-[#F5A623] hover:text-[#F5A623] transition"
                  >
                    + 안건 추가
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold mb-1">이메일 발송</h2>
            <p className="text-sm text-gray-400 mb-6">회의 안내 메일을 발송할 참여자를 선택하세요.</p>
            <div className="flex flex-col gap-2 mb-6">
              {users.filter(u => participants.includes(u.users_id)).map(u => (
                <label key={u.users_id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={emailTargets.includes(u.users_id)}
                    onChange={() => setEmailTargets(prev => prev.includes(u.users_id) ? prev.filter(x => x !== u.users_id) : [...prev, u.users_id])}
                    className="w-4 h-4 accent-[#F5A623]"
                  />
                  <div className="w-8 h-8 rounded-full bg-[#F5A623] flex items-center justify-center text-white text-sm font-bold">{u.name[0]}</div>
                  <span className="text-sm text-gray-700">{u.name}</span>
                </label>
              ))}
            </div>
            {emailSent && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700 font-medium">
                ✅ 이메일이 발송되었습니다.
              </div>
            )}
          </div>
        )}

        {/* 버튼 영역 */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
          {step === 0 ? (
            <button onClick={() => navigate("/meeting")} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              취소
            </button>
          ) : (
            <button onClick={() => setStep(s => s - 1)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              이전
            </button>
          )}

          <div className="flex gap-2">
            {step === 1 && (
              <button onClick={() => setStep(2)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                건너뛰기
              </button>
            )}
            {step === 2 && agenda.length > 0 && !agendaConfirmed && (
              <button onClick={handleConfirmAgenda} className="px-4 py-2 bg-[#1A1A2E] text-white rounded-lg text-sm font-semibold hover:bg-[#2a2a4e]">
                안건 확정
              </button>
            )}
            {step === 3 && emailTargets.length > 0 && !emailSent && (
              <button onClick={() => setEmailSent(true)} className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-semibold hover:bg-gray-800">
                메일 발송
              </button>
            )}

            {step === 0 ? (
              <button
                onClick={handleNextFromStep0}
                disabled={!canNext0 || submitting}
                className="px-5 py-2 bg-[#F5A623] text-white rounded-lg text-sm font-semibold hover:bg-[#e8951a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "생성 중..." : "다음"}
              </button>
            ) : step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="px-5 py-2 bg-[#F5A623] text-white rounded-lg text-sm font-semibold hover:bg-[#e8951a]"
              >
                다음
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="px-5 py-2 bg-[#F5A623] text-white rounded-lg text-sm font-semibold hover:bg-[#e8951a]"
              >
                완료
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}