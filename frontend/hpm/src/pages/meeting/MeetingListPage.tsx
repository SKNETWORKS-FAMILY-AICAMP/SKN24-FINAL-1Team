import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMeetingList, type Meeting } from "../../features/meeting/api";
import { useAuth } from "../../context/AuthContext";

const STATUS_MAP = {
  scheduled: { label: "예정", color: "bg-[#E8F4FD] text-[#2196F3]" },
  in_progress: { label: "진행중", color: "bg-[#FFE8E8] text-[#F44336]" },
  finished: { label: "종료", color: "bg-gray-100 text-gray-500" },
};

export default function MeetingListPage() {
  const navigate = useNavigate();
  const { projectId, } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  useEffect(() => {
    getMeetingList(projectId ?? undefined)
      .then(setMeetings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  const filtered = meetings.filter(m => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || m.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="p-8">
      {/* 검색바 */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="회의명을 입력하세요."
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 pr-10 text-sm outline-none focus:border-[#F5A623]"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        </div>
        <button className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-sm text-gray-600 flex items-center gap-2 hover:border-gray-300">
          상세검색 <span>▼</span>
        </button>
        <button className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-sm text-gray-600 hover:border-gray-300">
          검색
        </button>
      </div>

      {/* 필터 + 등록 버튼 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {statusFilter && (
            <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-xs px-3 py-1 rounded-full font-medium">
              상태: {STATUS_MAP[statusFilter as keyof typeof STATUS_MAP]?.label}
              <button onClick={() => setStatusFilter(null)} className="ml-1 hover:text-red-500">×</button>
            </span>
          )}
        </div>
        <button
          onClick={() => navigate("/meeting/create")}
          className="flex items-center gap-1 bg-[#1A1A2E] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#2a2a4e] transition"
        >
          + 회의 등록
        </button>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">불러오는 중...</div>
        ) : paged.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            {search ? "검색 결과가 없습니다." : "등록된 회의가 없습니다."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-gray-500 font-medium">회의명</th>
                <th className="text-left px-5 py-3.5 text-gray-500 font-medium">날짜/시간</th>
                <th className="text-left px-5 py-3.5 text-gray-500 font-medium">상태</th>
                <th className="text-left px-5 py-3.5 text-gray-500 font-medium">참여자</th>
              </tr>
            </thead>
            <tbody>
              {paged.map(m => {
                const st = STATUS_MAP[m.status] ?? STATUS_MAP.finished;
                return (
                  <tr
                    key={m.meeting_id}
                    onClick={() => navigate(`/meeting/${m.meeting_id}`)}
                    className="border-b border-gray-50 hover:bg-amber-50 cursor-pointer transition"
                  >
                    <td className="px-5 py-4">
                      <p className="font-medium text-gray-900">{m.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{m.location}</p>
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      <p className="font-medium">{m.meeting_at?.slice(0, 10)}</p>
                      <p className="text-xs text-gray-400">{m.meeting_at?.slice(11, 16)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer ${st.color}`}
                        onClick={e => { e.stopPropagation(); setStatusFilter(m.status); setPage(1); }}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {m.participants?.slice(0, 5).map(p => (
                          <div
                            key={p.user_id}
                            className="w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-gray-600 text-xs font-bold"
                            title={p.name}
                          >
                            {p.name[0]}
                          </div>
                        ))}
                        {(m.participants?.length ?? 0) > 5 && (
                          <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-gray-500 text-xs font-bold">
                            +{m.participants!.length - 5}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1 mt-5">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1 border border-gray-200 rounded text-sm bg-white disabled:opacity-40">‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`px-3 py-1 border rounded text-sm ${p === page ? "bg-[#1A1A2E] text-white border-[#1A1A2E]" : "bg-white border-gray-200 hover:border-gray-300"}`}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1 border border-gray-200 rounded text-sm bg-white disabled:opacity-40">›</button>
        </div>
      )}
    </div>
  );
}
