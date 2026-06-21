import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createMeeting, getUserList, getJiraStatus } from "../../services/meeting";
import { useAuth } from "../../context/AuthContext";
import * as DESIGN from "../../constants/design";
import Button from "../../components/ui/Button";

interface UserOption {
  users_id: number;
  name: string;
  email: string;
}

export default function MeetingCreatePage() {
  const navigate = useNavigate();
  const { projectId, user } = useAuth();
  
  const [users, setUsers] = useState<UserOption[]>([]);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [meetingDate, setMeetingDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [meetingTime, setMeetingTime] = useState(() => {
    return new Date().toTimeString().split(" ")[0].slice(0, 5);
  });
  const [participants, setParticipants] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdMeetingId, setCreatedMeetingId] = useState<number | null>(null);
  const [showJiraModal, setShowJiraModal] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [selectAgenda, setSelectAgenda] = useState(true);
  const [selectPrepMaterial, setSelectPrepMaterial] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getUserList()
      .then(list => {
        setUsers(list);
        if (list.length > 0) {
          setParticipants([list[0].users_id]);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleParticipant = (id: number) => {
    if (participants.length === 1 && participants.includes(id)) return;
    setParticipants(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    
    setSubmitting(true);
    try {
      const combinedDateTime = `${meetingDate}T${meetingTime}:00`;
      const meeting = await createMeeting({
        project_id: projectId ?? 1,
        title,
        location,
        meeting_at: combinedDateTime,
        participants,
      });
      setCreatedMeetingId(meeting.meeting_id);

      const { connected } = await getJiraStatus().catch(() => ({ connected: true }));
      if (!connected) {
        setShowJiraModal(true);
      } else {
        setShowSelectModal(true);
      }
    } catch (e) {
      console.error(e);
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error ?? "회의 생성에 실패했습니다.";
      setErrorMessage(msg);
      setShowErrorModal(true);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(
    u =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 날짜 제약 추가
  const todayDate = new Date().toISOString().split("T")[0];
  // 시간 제약 추가
  const currentTime = new Date().toTimeString().slice(0, 5);
  const minTime = meetingDate === todayDate ? currentTime : "00:00";

  // 과거 날짜/시간 검증
  const isPastDateTime = () => {
    if (!meetingDate || !meetingTime) return false;
    const selected = new Date(`${meetingDate}T${meetingTime}`);
    return selected < new Date();
  };

  // 활성화 제약 추가
  const canSubmit = title.trim().length >= 1 && meetingDate && meetingTime && participants.length >= 2 && !isPastDateTime();

  const handleJiraLink = () => {
    if (user?.users_id) {
      window.open(`${import.meta.env.VITE_API_BASE_URL}/jira/start/?user_id=${user.users_id}`, "_blank");
    }
    setShowJiraModal(false);
    setShowSelectModal(true);
  };

  const handleSelectConfirm = () => {
    setShowSelectModal(false);
    navigate(`/meetings/${createdMeetingId}/upload`, {
      state: { showAgenda: selectAgenda, showPrepMaterial: selectPrepMaterial },
    });
  };

  const handleSelectSkip = () => {
    setShowSelectModal(false);
    // 건너뛰기(기초 안건/회의 준비 자료 모두 숨김)
    navigate(`/meetings/${createdMeetingId}`, {
      state: { showAgenda: false, showPrepMaterial: false },
    });
  };

  return (
<div className="max-w-4xl mx-auto w-full min-h-[calc(100vh-120px)] flex flex-col justify-center items-center">

      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl w-80 overflow-hidden shadow-xl">
            <div className="px-8 py-10 text-center">
              <p className="text-[#623FB5] text-[14px] leading-relaxed">{errorMessage}</p>
            </div>
            <div className="border-t border-gray-200">
              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full py-4 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Jira 연동 유도 */}
      {showJiraModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl w-[420px] shadow-xl overflow-hidden">
            <div className="px-10 py-10 text-center">
              <p className={`${DESIGN.COLORS.purple} ${DESIGN.FONT_SIZES.md} leading-relaxed`}>
                JIRA 연동이 되어있지 않아<br />
                회의는 정상적으로 생성되지만,<br />
                <br />
                업무 분배는 불가합니다.<br />
                연동하시려면 아래 링크를 클릭해주세요.
              </p>
              <button
                onClick={handleJiraLink}
                className="mt-5 text-[#623FB5] font-bold text-[15px] hover:underline"
              >
                JIRA 연동하기
              </button>
            </div>
            <div className="border-t border-gray-200">
              <button
                onClick={() => { setShowJiraModal(false); setShowSelectModal(true); }}
                className={`w-full py-4 text-center ${DESIGN.FONT_SIZES.md} font-bold ${DESIGN.COLORS.black} hover:bg-gray-50 transition`}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/*자료 선택 */}
      {showSelectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl w-[420px] shadow-xl p-8">
            <p className={`${DESIGN.FONT_SIZES.md} ${DESIGN.COLORS.black} leading-relaxed mb-6`}>
              생성하실 자료를 선택해주세요<br />
              <span className={`${DESIGN.COLORS.gray}`}>필요하지 않다면 바로 넘어갈 수 있어요.</span>
            </p>
            <div className="flex flex-col gap-4 mb-8">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectAgenda}
                  onChange={e => setSelectAgenda(e.target.checked)}
                  className="hidden"
                />
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center border-2 transition flex-shrink-0
                    ${selectAgenda ? "bg-[#623FB5] border-[#623FB5]" : "border-gray-300 bg-white"}`}
                >
                  {selectAgenda && (
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                      <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className={`${DESIGN.FONT_SIZES.md} ${DESIGN.COLORS.black}`}>기초 안건</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectPrepMaterial}
                  onChange={e => setSelectPrepMaterial(e.target.checked)}
                  className="hidden"
                />
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center border-2 transition flex-shrink-0
                    ${selectPrepMaterial ? "bg-[#623FB5] border-[#623FB5]" : "border-gray-300 bg-white"}`}
                >
                  {selectPrepMaterial && (
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                      <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className={`${DESIGN.FONT_SIZES.md} ${DESIGN.COLORS.black}`}>회의 준비 자료</span>
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleSelectSkip}
                className="px-5 py-2.5 bg-[#623FB5] text-white text-sm rounded-lg hover:opacity-90"
              >
                건너 뛰기
              </button>
              <button
                onClick={handleSelectConfirm}
                className="px-5 py-2.5 bg-[#623FB5] text-white text-sm rounded-lg hover:opacity-90"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
  <div className="mb-6 justify-center w-full ">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h1 className={`${DESIGN.FONT_SIZES.h3} ${DESIGN.COLORS.black} font-bold`}>회의 기본 정보 입력</h1>
          <span className={`${DESIGN.FONT_SIZES.sm} text-red-500 font-medium`}>* 회의 생성 후 회의 정보는 수정 불가합니다.</span>
        </div>
        <p className={`${DESIGN.FONT_SIZES.sm} ${DESIGN.COLORS.gray} mt-1`}>
          회의 정보를 입력하고 생성할 수 있습니다.
        </p>
      </div>

      <form onSubmit={handleCreateMeeting} className="space-y-6 w-full">
        {/* 카드 영역 */}
        <div className={`${DESIGN.BACKGROUND_COLORS.background} ${DESIGN.RADIUS_SIZES.xl} p-8`}>
          {/* 회의 주제 */}
          <div>
            <label className={`block ${DESIGN.FONT_SIZES.md} font-medium ${DESIGN.COLORS.black} mb-2`}>
              회의 주제
            </label>
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={30}
                placeholder="AI 매칭 엔진 고도화 및 프로젝트 진행 상황 점검 회의"
                className={`w-full ${DESIGN.BACKGROUND_COLORS.white} ${DESIGN.BORDER_COLORS.lightGray} ${DESIGN.RADIUS_SIZES.md} ${DESIGN.FONT_SIZES.md} px-4 py-3 outline-none focus:border-[#623FB5] focus:ring-1 focus:ring-[#623FB5]/10 transition`}
                required
              />
              <p className={`text-right mt-1.5 ${DESIGN.FONT_SIZES.sm} ${DESIGN.COLORS.gray}`}>{title.length}/30</p>
            </div>
          </div>

          {/* 회의 장소 */}
          <div>
            <label className={`block ${DESIGN.FONT_SIZES.md} font-medium ${DESIGN.COLORS.black} mb-2`}>
              회의 장소
            </label>
            <div className="relative">
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                maxLength={50}
                placeholder="3층 회의실 A"
                className={`w-full ${DESIGN.BACKGROUND_COLORS.white} ${DESIGN.BORDER_COLORS.lightGray} ${DESIGN.RADIUS_SIZES.md} ${DESIGN.FONT_SIZES.md} px-4 py-3 outline-none focus:border-[#623FB5] focus:ring-1 focus:ring-[#623FB5]/10 transition`}
              />
              <p className={`text-right mt-1.5 ${DESIGN.FONT_SIZES.sm} ${DESIGN.COLORS.gray}`}>{location.length}/50</p>
            </div>
          </div>

          {/* 회의 날짜/시작 시간 */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className={`block ${DESIGN.FONT_SIZES.md} font-medium ${DESIGN.COLORS.black} mb-2`}>
                회의 날짜
              </label>
              <input
                type="date"
                value={meetingDate}
                min={todayDate} // 날짜 제약 추가
                onChange={e => setMeetingDate(e.target.value)}
                className={`w-full ${DESIGN.BACKGROUND_COLORS.white} ${DESIGN.BORDER_COLORS.lightGray} ${DESIGN.RADIUS_SIZES.md} ${DESIGN.FONT_SIZES.md} px-4 py-3 outline-none focus:border-[#623FB5] transition`}
                required
              />
            </div>

            <div>
              <label className={`block ${DESIGN.FONT_SIZES.md} font-medium ${DESIGN.COLORS.black} mb-2`}>
                회의 시작 시간
              </label>
              <input
                type="time"
                value={meetingTime}
                min={minTime} // 시간 제약 추가
                onChange={e => setMeetingTime(e.target.value)}
                className={`w-full ${DESIGN.BACKGROUND_COLORS.white} ${DESIGN.BORDER_COLORS.lightGray} ${DESIGN.RADIUS_SIZES.md} ${DESIGN.FONT_SIZES.md} px-4 py-3 outline-none focus:border-[#623FB5] transition`}
                required
              />
            </div>
          </div>

          {/* 참여자 선택 */}
          <div ref={dropdownRef} className="relative">
            <label className={`block ${DESIGN.FONT_SIZES.md} font-medium ${DESIGN.COLORS.black} mb-2 mt-[26px]`}>
              참여자 선택
            </label>
            <div
              onClick={() => setShowDropdown(v => !v)}
              className={`w-full ${DESIGN.BACKGROUND_COLORS.white} ${DESIGN.BORDER_COLORS.lightGray} ${DESIGN.RADIUS_SIZES.md} p-2.5 min-h-[48px] flex flex-wrap gap-2 items-center cursor-pointer`}
            >
              {participants.map(id => {
                const u = users.find(user => user.users_id === id);
                if (!u) return null;
                return (
                  <span
                    key={id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 ${DESIGN.RADIUS_SIZES.md} ${DESIGN.BORDER_COLORS.lightGray} ${DESIGN.BACKGROUND_COLORS.white} ${DESIGN.FONT_SIZES.sm} ${DESIGN.COLORS.black} font-medium transition`}
                  >
                    <span>{u.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleParticipant(id);
                      }}
                      className={`${DESIGN.COLORS.gray} hover:text-black ml-1`}
                    >
                      ✕
                    </button>
                  </span>
                );
              })}
              {participants.length === 0 && (
                <span className={`${DESIGN.COLORS.gray} ${DESIGN.FONT_SIZES.sm} pl-2`}>참여자를 선택해주세요. (최소 2명)</span>
              )}
            </div>

            {/* 참여자 선택 드롭다운 */}
            {showDropdown && (
              <div className={`absolute left-0 right-0 mt-1 ${DESIGN.BACKGROUND_COLORS.white} ${DESIGN.BORDER_COLORS.lightGray} rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto p-2`} onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="이름 또는 이메일 검색..."
                  className={`w-full ${DESIGN.BACKGROUND_COLORS.white} border border-gray-200 rounded-md px-3 py-2 mb-2 ${DESIGN.FONT_SIZES.sm} outline-none focus:border-[#623FB5]`}
                />
                <div className="space-y-0.5">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map(u => {
                      const isSelected = participants.includes(u.users_id);
                      return (
                        <button
                          key={u.users_id}
                          type="button"
                          onClick={() => toggleParticipant(u.users_id)}
                          className={`w-full text-left px-3 py-2 rounded ${DESIGN.FONT_SIZES.sm} transition ${
                            isSelected
                              ? `${DESIGN.BACKGROUND_COLORS.purpleHover} font-semibold`
                              : `${DESIGN.BACKGROUND_COLORS.grayLightHover} ${DESIGN.COLORS.black}`
                          }`}
                        >
                          {u.name} ({u.email})
                        </button>
                      );
                    })
                  ) : (
                    <p className={`text-center py-2 ${DESIGN.FONT_SIZES.sm} ${DESIGN.COLORS.gray}`}>검색 결과가 없습니다.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 최하단 생성 버튼 */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!canSubmit || submitting}
            size="lg"
            className="!w-auto px-10"
          >
            생성
          </Button>
        </div>
      </form>
    </div>
  );
}