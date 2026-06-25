import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { sendProjectChatMessage } from "../../services/meeting";
import sendImg from "../../assets/meeting/send.png";

type ChatMsg = { role: "user" | "bot"; content: string };

export default function FloatingChatbot() {
  const { projectId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // 프로젝트 바뀌면 대화 초기화
  useEffect(() => {
    setChatMessages([]);
    setChatInput("");
  }, [projectId]);

  // 메시지 추가될 때 스크롤 아래로
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading || !projectId) return;

    const query = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { role: "user", content: query }]);
    setChatLoading(true);

    try {
      const res = await sendProjectChatMessage(projectId, query);
      setChatMessages((prev) => [...prev, { role: "bot", content: res.answer }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "bot", content: "답변을 가져오는데 실패했습니다." },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <>
      {/* 채팅창 */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-[320px] h-[460px] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col z-50">
          {/* 헤더 */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-bold text-[#141414]">회의 챗봇</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition text-lg leading-none"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>

          {/* 메시지 목록 */}
          <div ref={chatRef} className="flex-1 overflow-y-auto overflow-x-hidden p-4 flex flex-col gap-3">
            {!projectId ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-xs text-gray-400">프로젝트를 선택하면 챗봇을 사용할 수 있습니다.</p>
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <p className="text-xs text-gray-400">
                  회의 준비 자료나 안건에 대해 자유롭게 질문해 보세요!
                </p>
              </div>
            ) : (
              chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`text-xs px-3 py-2 rounded-2xl max-w-[85%] border break-all ${
                      msg.role === "user"
                        ? "bg-[#F3F0FF] border-[#623FB5] text-[#141414] rounded-tr-sm"
                        : "bg-[#FAF9F7] border-[#FAF9F7] text-[#141414] rounded-tl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}

            {chatLoading && (
              <div className="items-start flex flex-col">
                <div className="bg-gray-100 text-gray-400 text-xs px-3 py-2 rounded-2xl rounded-tl-sm">
                  답변 생성 중...
                </div>
              </div>
            )}
          </div>

          {/* 입력창 */}
          <div className="p-4 border-t border-gray-100">
            <div className="relative flex items-center">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                disabled={!projectId || chatLoading}
                placeholder={projectId ? "챗봇한테 질문해보세요" : "프로젝트를 먼저 선택해주세요"}
                className="w-full text-xs pl-4 pr-10 py-3 border border-gray-200 rounded-xl outline-none focus:border-[#623FB5] disabled:bg-gray-50 disabled:text-gray-300 transition"
              />
              <button
                onClick={sendChat}
                disabled={!projectId || chatLoading}
                className="absolute right-2.5 w-7 h-7 flex items-center justify-center hover:opacity-70 active:scale-95 disabled:opacity-30 transition"
                aria-label="전송"
              >
                <img src={sendImg} alt="전송" className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 플로팅 버튼 */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-6 right-6 w-12 h-12 bg-[#623FB5] rounded-full shadow-lg flex items-center justify-center hover:bg-[#4f32a0] active:scale-95 transition z-50"
        aria-label="챗봇 열기"
      >
        {isOpen ? (
          <span className="text-white text-lg leading-none">✕</span>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </>
  );
}
