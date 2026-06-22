import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getMeetingList, type Meeting } from "../../services/meeting";
import { useAuth } from "../../context/AuthContext";
import Table from "../../components/ui/Table";
import type { TableColumn } from "../../components/ui/Table";
import Pagination from "../../components/ui/Pagination";
import Button from "../../components/ui/Button";
import * as DESIGN from "../../constants/design";

const MOCK_MEETINGS: Meeting[] = [
  {
    meeting_id: 1,
    title: "AI 매칭 엔진 스프린트 리뷰 1차",
    location: "대륭 테크노파티 타운 100차 203917층",
    meeting_at: "2026-06-10T09:00:00",
    status: "scheduled",
    minutes_status: "draft",
    meeting_document: null,
    is_meeting: true,
    project: 1,
    participants: [
      { user_id: 1, name: "김지원" },
      { user_id: 2, name: "류지지" },
      { user_id: 3, name: "박수영" },
      { user_id: 4, name: "남윤진" },
      { user_id: 5, name: "이지우" },
      { user_id: 6, name: "김민준" }
    ]
  },
  {
    meeting_id: 2,
    title: "AI 매칭 엔진 스프린트 리뷰 2차",
    location: "대륭 테크노파티 타운 100차 203917층",
    meeting_at: "2026-06-12T14:30:00",
    status: "in_progress",
    minutes_status: "reviewing",
    meeting_document: null,
    is_meeting: true,
    project: 1,
    participants: [
      { user_id: 1, name: "김지원" },
      { user_id: 2, name: "류지지" },
      { user_id: 3, name: "박수영" },
      { user_id: 8, name: "김규호" }
    ]
  },
  {
    meeting_id: 3,
    title: "UI/UX 디자인 통일성 가이드라인 회의",
    location: "회의실 B",
    meeting_at: "2026-06-08T11:00:00",
    status: "finished",
    minutes_status: "approved",
    meeting_document: null,
    is_meeting: true,
    project: 1,
    participants: [
      { user_id: 3, name: "박수영" },
      { user_id: 9, name: "김은종" },
      { user_id: 10, name: "강강찬" }
    ]
  },
  {
    meeting_id: 4,
    title: "Jira 이슈 트래커 연동 사양 검토",
    location: "온라인 (Zoom)",
    meeting_at: "2026-06-05T15:00:00",
    status: "finished",
    minutes_status: "approved",
    meeting_document: null,
    is_meeting: true,
    project: 1,
    participants: [
      { user_id: 7, name: "류지우" },
      { user_id: 1, name: "김지원" },
      { user_id: 6, name: "김민준" },
      { user_id: 11, name: "이가은" }
    ]
  },
  {
    meeting_id: 5,
    title: "OCR 기반 안건 자동 추출 성능 테스트",
    location: "회의실 A",
    meeting_at: "2026-06-02T10:00:00",
    status: "finished",
    minutes_status: "approved",
    meeting_document: null,
    is_meeting: true,
    project: 1,
    participants: [
      { user_id: 8, name: "김규호" },
      { user_id: 10, name: "강강찬" },
      { user_id: 12, name: "김가은" }
    ]
  },
  {
    meeting_id: 6,
    title: "1차 MVP 개발 현황 공유 및 피드백",
    location: "회의실 C",
    meeting_at: "2026-05-28T16:00:00",
    status: "finished",
    minutes_status: "approved",
    meeting_document: null,
    is_meeting: true,
    project: 1,
    participants: [
      { user_id: 5, name: "남윤진" },
      { user_id: 1, name: "김지원" },
      { user_id: 3, name: "박수영" },
      { user_id: 13, name: "이지우" }
    ]
  },
  {
    meeting_id: 7,
    title: "DB 스키마 마이그레이션 및 인덱싱 회의",
    location: "온라인",
    meeting_at: "2026-05-25T13:30:00",
    status: "finished",
    minutes_status: "approved",
    meeting_document: null,
    is_meeting: true,
    project: 1,
    participants: [
      { user_id: 1, name: "김지원" },
      { user_id: 7, name: "류지우" },
      { user_id: 8, name: "김규호" },
      { user_id: 14, name: "정몽주" }
    ]
  },
  {
    meeting_id: 8,
    title: "챗봇 기반 회의록 질의응답 기능 설계",
    location: "회의실 A",
    meeting_at: "2026-05-20T11:30:00",
    status: "finished",
    minutes_status: "approved",
    meeting_document: null,
    is_meeting: true,
    project: 1,
    participants: [
      { user_id: 15, name: "김은우" },
      { user_id: 12, name: "김가은" },
      { user_id: 16, name: "이성계" },
      { user_id: 10, name: "강강찬" }
    ]
  },
  {
    meeting_id: 9,
    title: "프론트엔드 테일윈드 컴포넌트 리팩토링",
    location: "회의실 B",
    meeting_at: "2026-05-18T14:00:00",
    status: "finished",
    minutes_status: "approved",
    meeting_document: null,
    is_meeting: true,
    project: 1,
    participants: [
      { user_id: 7, name: "류지우" },
      { user_id: 3, name: "박수영" },
      { user_id: 1, name: "김지원" }
    ]
  },
  {
    meeting_id: 10,
    title: "프로젝트 최종 마일스톤 점검 회의",
    location: "대륭 테크노파티 타운 100차 203917층",
    meeting_at: "2026-05-15T10:30:00",
    status: "finished",
    minutes_status: "approved",
    meeting_document: null,
    is_meeting: true,
    project: 1,
    participants: [
      { user_id: 1, name: "김지원" },
      { user_id: 2, name: "류지지" },
      { user_id: 3, name: "박수영" },
      { user_id: 6, name: "김민준" },
      { user_id: 5, name: "남윤진" },
      { user_id: 13, name: "이지우" }
    ]
  }
];

export default function MeetingListPage() {
  const navigate = useNavigate();
  const { projectId } = useAuth();

  const [meetings, setMeetings] = useState<Meeting[]>(MOCK_MEETINGS);
  const [loading, setLoading] = useState(false);

  // 필터 관련 상태들
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // 선택된 행들의 ID 집합
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // 페이지네이션 상태
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => {
    getMeetingList(projectId ?? undefined)
      .then((data) => {
        if (data && data.length > 0) {
          setMeetings(data);
        }
      })
      .catch((err) => {
        console.warn("API 호출 실패, 로컬 더미 데이터를 유지합니다.", err);
      });
  }, [projectId]);

  // 클라이언트 사이드 필터링 로직
  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => {
      // 검색어 필터 
      const creatorName = m.participants?.[0]?.name || "";
      const matchSearch =
        m.title.toLowerCase().includes(search.toLowerCase()) ||
        creatorName.toLowerCase().includes(search.toLowerCase());

      // 상태 필터
      const matchStatus = statusFilter === "all" || m.status === statusFilter;

      // 기간 필터
      let matchPeriod = true;
      if (periodFilter !== "all" && m.meeting_at) {
        const meetingDate = new Date(m.meeting_at);
        const now = new Date();

        if (periodFilter === "week") {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchPeriod = meetingDate >= oneWeekAgo && meetingDate <= now;
        } else if (periodFilter === "month") {
          const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          matchPeriod = meetingDate >= oneMonthAgo && meetingDate <= now;
        } else if (periodFilter === "3months") {
          const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          matchPeriod = meetingDate >= threeMonthsAgo && meetingDate <= now;
        } else if (periodFilter === "custom") {
          const start = startDate ? new Date(startDate + "T00:00:00") : null;
          const end = endDate ? new Date(endDate + "T23:59:59") : null;
          if (start && meetingDate < start) matchPeriod = false;
          if (end && meetingDate > end) matchPeriod = false;
        }
      }

      return matchSearch && matchStatus && matchPeriod;
    });
  }, [meetings, search, statusFilter, periodFilter, startDate, endDate]);

  // 페이지네이션 처리
  const totalPages = Math.ceil(filteredMeetings.length / PER_PAGE);
  const pagedMeetings = useMemo(() => {
    const startIdx = (page - 1) * PER_PAGE;
    return filteredMeetings.slice(startIdx, startIdx + PER_PAGE);
  }, [filteredMeetings, page]);

  // 전체 선택 / 해제 토글
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = pagedMeetings.map((m) => m.meeting_id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  // 개별 선택 토글
  const handleSelectRow = (meetingId: number, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) {
      next.add(meetingId);
    } else {
      next.delete(meetingId);
    }
    setSelectedIds(next);
  };

  // 선택된 회의록들 가상 삭제 처리
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (window.confirm(`선택한 ${selectedIds.size}개의 회의를 삭제하시겠습니까?`)) {
      setMeetings((prev) => prev.filter((m) => !selectedIds.has(m.meeting_id)));
      setSelectedIds(new Set());
      setPage(1);
      alert("삭제되었습니다.");
    }
  };

  // 이메일 발송 목(mock) 처리
  const handleSendEmail = (e: React.MouseEvent, meetingTitle: string) => {
    e.stopPropagation();
    alert(`[${meetingTitle}] 회의 정보 및 결과 메일을 성공적으로 발송했습니다.`);
  };

  // 테이블 컬럼 스키마 정의 (mockup 시안 일치)
  const columns: TableColumn<Meeting>[] = [
    {
      key: "select",
      header: (
        <input
          type="checkbox"
          checked={pagedMeetings.length > 0 && pagedMeetings.every((m) => selectedIds.has(m.meeting_id))}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="w-4 h-4 cursor-pointer accent-[#623FB5]"
        />
      ),
      width: "60px",
      align: "center",
      render: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.meeting_id)}
          onChange={(e) => handleSelectRow(row.meeting_id, e.target.checked)}
          onClick={(e) => e.stopPropagation()} // 행 클릭 이벤트 전파 방지
          className="w-4 h-4 cursor-pointer accent-[#623FB5]"
        />
      ),
    },
    {
      key: "title",
      header: "회의명",
      align: "left",
      render: (row) => (
        <button
          onClick={() => {
            if (row.status !== "scheduled" && row.status !== "in_progress") {
              navigate(`/meetings/${row.meeting_id}/archive`);
            } else {
              navigate(`/meetings/${row.meeting_id}`);
            }
          }}
          className="flex items-center text-start gap-1 font-semibold text-[#141414] hover:text-[#623FB5] transition-colors"
        >
          {row.title} <span className="text-[12px] text-gray-400 font-bold">&rsaquo;</span>
        </button>
      ),
    },
    {
      key: "location",
      header: "회의 장소",
      align: "left",
      render: (row) => <span className={DESIGN.COLORS.gray}>{row.location || "-"}</span>,
    },
    {
      key: "status",
      header: "상태",
      width: "110px",
      align: "center",
      render: (row) => {
        if (row.status === "scheduled") {
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/meetings/${row.meeting_id}`, { state: { status: "scheduled" } });
              }}
              className="px-4 py-1 text-[12px] font-semibold rounded-[5px] inline-block w-[72px] text-center bg-[#2196F3] text-white hover:opacity-80 transition cursor-pointer"
            >
              예정
            </button>
          );
        }
        if (row.status === "in_progress") {
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/meetings/${row.meeting_id}`, { state: { status: "in_progress" } });
              }}
              className="px-4 py-1 text-[12px] font-semibold rounded-[5px] inline-block w-[72px] text-center bg-[#623FB5] text-white hover:opacity-80 transition cursor-pointer"
            >
              진행 중
            </button>
          );
        }
        return (
          <span className="px-4 py-1 text-[12px] font-semibold rounded-[5px] inline-block w-[72px] text-center bg-gray-100 text-gray-500">
            종료
          </span>
        );
      },
    },
    {
      key: "creator",
      header: "생성자",
      width: "100px",
      align: "center",
      render: (row) => <span>{row.participants?.[0]?.name || "알수없음"}</span>,
    },
    {
      key: "date",
      header: "날짜",
      width: "180px",
      align: "center",
      render: (row) => (
        <span>
          {row.meeting_at ? row.meeting_at.replace("T", " ").slice(0, 16) : "-"}
        </span>
      ),
    },
    {
      key: "participants",
      header: "참여자",
      align: "left",
      render: (row) => {
        const list = row.participants || [];
        if (list.length === 0) return <span>-</span>;
        const shownNames = list.slice(0, 3).map((p) => p.name).join(", ");
        const extraCount = list.length - 3;

        return (
          <div className="leading-relaxed text-[#141414]">
            <span className="break-keep">{shownNames}</span>
            {extraCount > 0 && (
              <span className={`inline-block whitespace-nowrap ml-1.5 px-2 py-0.5 border border-gray-300 ${DESIGN.RADIUS_SIZES.xl} ${DESIGN.FONT_SIZES.sm} text-gray-500 font-semibold bg-[#F4F5F8] align-middle`}>
                +{extraCount}명
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "email",
      header: "이메일 발송",
      width: "140px",
      align: "center",
      render: (row) => (
        <Button onClick={(e) => handleSendEmail(e, row.title)}>
          이메일 발송
        </Button>
      ),
    },
  ];

  return (
    <div className="w-full flex flex-col py-6">
      {/* 타이틀 영역 */}
      <div className="mb-6">
        <h1 className={`${DESIGN.FONT_SIZES.h3} ${DESIGN.COLORS.black} font-bold`}>회의 목록</h1>
        <p className={`${DESIGN.FONT_SIZES.sm} ${DESIGN.COLORS.gray} mt-1`}>
          회의를 등록하고 관리할 수 있습니다.
        </p>
      </div>

      {/* 검색 및 상세 필터링 영역 */}
      <div className="flex flex-col gap-4 mb-6">
        {/* 검색 인풋 */}
        <div className="relative w-full max-w-sm">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="회의 명이나 생성자를 입력해주세요"
            className={`w-full ${DESIGN.BACKGROUND_COLORS.white} ${DESIGN.BORDER_COLORS.gray} ${DESIGN.RADIUS_SIZES.md} ${DESIGN.FONT_SIZES.sm} pl-4 pr-10 py-2.5 outline-none focus:border-[#623FB5] focus:ring-1 focus:ring-[#623FB5]/10 transition`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer">
          </span>
        </div>

        {/* 하단 세부 필터 (상태, 기간, 삭제 버튼) */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            {/* 상태 필터 */}
            <div className="flex items-center gap-2">
              <span className={`${DESIGN.FONT_SIZES.sm} ${DESIGN.COLORS.black} font-semibold`}>상태</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className={`py-2 px-3 bg-white ${DESIGN.BORDER_COLORS.gray} ${DESIGN.RADIUS_SIZES.sm} ${DESIGN.FONT_SIZES.sm} outline-none cursor-pointer focus:border-[#623FB5]`}
              >
                <option value="all">전체</option>
                <option value="scheduled">예정</option>
                <option value="in_progress">진행 중</option>
                <option value="finished">종료</option>
              </select>
            </div>

            {/* 기간 필터 */}
            <div className="flex items-center gap-2">
              <span className={`${DESIGN.FONT_SIZES.sm} ${DESIGN.COLORS.black} font-semibold`}>기간</span>
              <select
                value={periodFilter}
                onChange={(e) => {
                  setPeriodFilter(e.target.value);
                  setPage(1);
                }}
                className={`py-2 px-3 bg-white ${DESIGN.BORDER_COLORS.gray} ${DESIGN.RADIUS_SIZES.sm} ${DESIGN.FONT_SIZES.sm} outline-none cursor-pointer focus:border-[#623FB5]`}
              >
                <option value="all">전체</option>
                <option value="week">최근 1주일</option>
                <option value="month">최근 1개월</option>
                <option value="3months">최근 3개월</option>
                <option value="custom">직접 입력</option>
              </select>
            </div>

            {/* 직접 입력 시 표시되는 날짜 인풋 */}
            {periodFilter === "custom" && (
              <div className="flex items-center gap-2 transition-all duration-200">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setPage(1);
                  }}
                  className={`py-1.5 px-2 bg-white ${DESIGN.BORDER_COLORS.gray} ${DESIGN.RADIUS_SIZES.sm} ${DESIGN.FONT_SIZES.sm} outline-none focus:border-[#623FB5]`}
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setPage(1);
                  }}
                  className={`py-1.5 px-2 bg-white ${DESIGN.BORDER_COLORS.gray} ${DESIGN.RADIUS_SIZES.sm} ${DESIGN.FONT_SIZES.sm} outline-none focus:border-[#623FB5]`}
                />
              </div>
            )}
          </div>

          {/* 삭제 버튼 */}
          <Button
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0}
            className="px-6"
          >
            삭제
          </Button>
        </div>
      </div>

      {/*메인 테이블 영역 */}
      <Table data={pagedMeetings} columns={columns} isLoading={loading} />

      {/* 페이지네이션 영역 */}
      {!loading && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          className="mt-8"
        />
      )}
    </div>
  );
}
