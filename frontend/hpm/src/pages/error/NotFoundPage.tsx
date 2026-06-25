import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center select-none bg-gradient-to-b from-white to-[#F9F8FD]">
      {/* 404 Illustration wrapper with floating micro-animation */}
      <div className="relative mb-6 animate-bounce" style={{ animationDuration: "3s" }}>
        {/* SVG Decorative Background Circle */}
        <div className="absolute inset-0 m-auto w-40 h-40 bg-[#623FB5]/5 rounded-full blur-xl"></div>
      </div>

      {/* Large Gradient Heading */}
      <h1 className="text-8xl font-extrabold mb-[10px]">
        404
      </h1>

      {/* Descriptive Title */}
      <h2 className="text-2xl font-bold text-[#141414] mb-2">
        원하시는 페이지를 찾을 수 없습니다
      </h2>

      {/* Detail Message */}
      <p className="text-md text-[#767676] max-w-md mb-8 leading-relaxed">
        요청하신 페이지의 경로가 변경되었거나 삭제되었을 수 있습니다.<br />
        입력하신 주소가 올바른지 다시 한번 확인해 주세요.
      </p>

      {/* Interactive Control Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 text-sm font-semibold rounded-xl border border-[#E6E1E6] bg-white text-[#141414] shadow-sm transition hover:bg-gray-50 active:scale-[0.98] cursor-pointer"
        >
          이전 페이지로
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-6 py-3 text-sm font-semibold rounded-xl text-white shadow-md shadow-[#623FB5]/10 transition hover:bg-[#52339d] active:scale-[0.98] cursor-pointer"
          style={{ backgroundColor: "#623FB5" }}
        >
          메인 대시보드로
        </button>
      </div>
    </div>
  );
}
