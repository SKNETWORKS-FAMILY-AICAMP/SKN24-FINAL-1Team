import { useEffect, useState } from "react";
import { getMeetings } from "../../features/meeting/api";
import type { Meeting } from "../../types/meeting";

export default function MeetingRecordResultPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    getMeetings().then(setMeetings);
  }, []);

  const toggleTaskExpand = (meetingId: number, taskIndex: number) => {
    const key = `${meetingId}-${taskIndex}`;
    setExpandedTasks((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // 📄 PDF 다운로드 (브라우저 인쇄 창 호출)
  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="flex min-h-[100vh] w-full justify-center bg-gray-100 p-10 print:bg-white print:p-0">
      <div id="pdf-content" className="mt-16 w-[900px] rounded-2xl bg-white p-10 shadow print:mt-0 print:w-full print:p-0 print:shadow-none">
        
        {/* 상단 헤더 영역 */}
        <div className="flex justify-between items-center w-full mb-8 print:mb-6">
          <h1 className="cafe24-font text-4xl font-bold">회의록</h1>
          
          <button 
            onClick={handleDownloadPDF}
            className="cafe24-font text-lg font-semibold flex items-center gap-2 bg-[#EE9F28] hover:bg-[#d68f24] text-white px-4 py-2 rounded-lg transition-colors shadow-sm print:hidden"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={2} 
              stroke="currentColor" 
              className="w-5 h-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            PDF 다운로드
          </button>
        </div>
        
        {meetings.map((meeting) => (
          <div 
            key={meeting.meeting_id} 
            className="mb-10 overflow-hidden rounded-xl border border-gray-200 bg-white print:mb-0 print:border-none print:overflow-visible print:rounded-none print:break-after-page"
          >
            {/* 💡 FIX 1: input을 감싸는 div를 명확히 분리하고 py-4 패딩을 부여해 input이 선을 침범하지 못하게 차단 */}
            <div className="flex border-b border-gray-200 min-h-[56px] items-center">
              <div className="w-[150px] bg-gray-50 p-4 font-bold shrink-0 self-stretch flex items-center">회의 주제</div>
              <div className="flex-1 px-4 py-2">
                <input
                  type="text"
                  placeholder="회의 주제를 입력하세요"
                  value={meeting.location}
                  className="w-full outline-none bg-transparent block"
                />
              </div>
            </div>

            {/* 💡 FIX 2: 복합 행도 동일하게 구조화하고, border-r 계산 꼬임을 막기 위해 중간 구분선 div 분리 */}
            <div className="flex border-b border-gray-200 min-h-[56px] items-center">
              <div className="w-[150px] bg-gray-50 p-4 font-bold shrink-0 self-stretch flex items-center">회의 일시</div>
              <div className="flex-1 border-r border-gray-200 px-4 py-2">
                <input
                  type="text"
                  placeholder="회의 일시 입력"
                  value={new Date(meeting.meeting_at).toLocaleString("ko-KR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                  className="w-full outline-none bg-transparent block"
                />
              </div>
              <div className="w-[120px] bg-gray-50 p-4 font-bold shrink-0 self-stretch flex items-center">작성자</div>
              <div className="w-[200px] px-4 py-2">
                <input
                  type="text"
                  placeholder="작성자 입력"
                  value="박수영"
                  className="w-full outline-none bg-transparent block"
                />
              </div>
            </div>

            {/* 💡 FIX 3: 사라지던 회의 장소 하단 선 방어 */}
            <div className="flex border-b border-gray-200 min-h-[56px] items-center">
              <div className="w-[150px] bg-gray-50 p-4 font-bold shrink-0 self-stretch flex items-center">회의 장소</div>
              <div className="flex-1 px-4 py-2">
                <input
                  type="text"
                  placeholder="회의 장소 입력"
                  value={meeting.location}
                  className="w-full outline-none bg-transparent block"
                />
              </div>
            </div>

            {/* 💡 FIX 4: 사라지던 참석자 하단 선 방어 */}
            <div className="flex border-b border-gray-200 min-h-[56px] items-center">
              <div className="w-[150px] bg-gray-50 p-4 font-bold shrink-0 self-stretch flex items-center">참석자</div>
              <div className="flex-1 px-4 py-2">
                <input
                  type="text"
                  placeholder="참석자 입력"
                  value="김규호, 김민준, 김지원, 류지우, 박수영, 황인규"
                  className="w-full outline-none bg-transparent block"
                />
              </div>
            </div>

            <div className="border-b border-gray-200 bg-gray-50 p-4 text-center text-xl font-bold">
              회의 내용
            </div>
            <textarea
              placeholder="회의 내용 입력"
              className="block h-[400px] w-full resize-none border-b border-gray-200 p-4 outline-none bg-transparent"
            />

            <div className="bg-gray-50 p-4 text-center text-xl font-bold">
              업무
            </div>

            {/* 업무 헤더 영역 */}
            <div className="grid grid-cols-13 border-y border-gray-200 bg-gray-50 font-bold print:break-inside-avoid">
              <div className="col-span-6 border-r border-gray-200 p-4 text-center">업무 명</div>
              <div className="col-span-2 border-r border-gray-200 p-4 text-center">담당자</div>
              <div className="col-span-3 border-r border-gray-200 p-4 text-center">기한</div>
              <div className="col-span-2 p-4 text-center">우선순위</div>
            </div>

            {/* 업무 목록 리스트 */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((item, index) => {
              const taskKey = `${meeting.meeting_id}-${index}`;
              const isTaskExpanded = !!expandedTasks[taskKey];

              return (
                <div key={item} className="border-b border-gray-200 last:border-b-0 print:break-inside-avoid">
                  <div className="grid grid-cols-13 items-center">
                    
                    <div className="col-span-6 flex items-center border-r border-gray-200 p-4">
                      <input type="text" placeholder="업무" className="flex-1 outline-none bg-transparent" />
                      <button
                        type="button"
                        onClick={() => toggleTaskExpand(meeting.meeting_id, index)}
                        className="text-xs text-blue-500 font-semibold hover:underline whitespace-nowrap print:hidden ml-2"
                      >
                        {isTaskExpanded ? "접기 ▲" : "더보기 ▼"}
                      </button>
                    </div>
                    
                    <div className="col-span-2 border-r border-gray-200 p-4">
                      <input type="text" placeholder="담당자" className="w-full outline-none bg-transparent text-center" />
                    </div>
                    
                    <div className="col-span-3 border-r border-gray-200 p-4">
                      <input type="text" placeholder="기한" className="w-full outline-none bg-transparent text-center" />
                    </div>
                    
                    <div className="col-span-2 p-4">
                      <input type="text" placeholder="우선순위" className="w-full outline-none bg-transparent text-center" />
                    </div>

                  </div>

                  {isTaskExpanded && (
                    <div className="bg-gray-50 border-t border-gray-100 p-4 print:hidden">
                      <textarea
                        placeholder="업무 상세 내용을 입력하세요"
                        className="w-full h-24 p-3 border border-gray-200 rounded-lg resize-none outline-none bg-white text-sm"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}