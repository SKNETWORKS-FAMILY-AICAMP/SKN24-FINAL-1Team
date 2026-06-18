import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../features/meeting/api";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (next.length < 6) { setError("새 비밀번호는 6자 이상이어야 합니다."); return; }
    if (next !== confirm) { setError("새 비밀번호가 일치하지 않습니다."); return; }
    if (current !== "abc123" && current.length < 1) { setError("기존 비밀번호를 입력하세요."); return; }

    setLoading(true);
    try {
      const res = await api.patch(`/users/${user?.users_id}/`, {
        password: next,
      });
      // 유저 정보 업데이트 (is_initial_password false로)
      login({ ...user!, ...res.data, is_initial_password: false });
      navigate("/projects");
    } catch {
      setError("비밀번호 변경에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6">
        <span className="font-bold text-lg">Meeting<span className="text-[#F5A623]">Flow</span></span>
      </header>

      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm p-10 w-full max-w-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-[#F5A623] flex items-center justify-center text-white font-bold">
              🔒
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">비밀번호 변경 필요</h1>
              <p className="text-xs text-gray-400">최초 로그인 시 비밀번호를 변경해야 합니다.</p>
            </div>
          </div>

          <div className="my-5 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            보안을 위해 초기 비밀번호 <b>abc123</b>을 새 비밀번호로 변경해주세요.
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">기존 비밀번호 <span className="text-red-500">*</span></label>
              <input
                type="password"
                value={current}
                onChange={e => setCurrent(e.target.value)}
                placeholder="기존 비밀번호를 입력하세요."
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#F5A623]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 <span className="text-red-500">*</span></label>
              <input
                type="password"
                value={next}
                onChange={e => setNext(e.target.value)}
                placeholder="새 비밀번호를 입력하세요. (6자 이상)"
                required
                className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-[#F5A623]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 재확인 <span className="text-red-500">*</span></label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="새 비밀번호를 다시 입력하세요."
                required
                className={`w-full border rounded-lg px-4 py-3 text-sm outline-none transition
                  ${confirm && next !== confirm ? "border-red-400 focus:border-red-400" : "border-gray-200 focus:border-[#F5A623]"}`}
              />
              {confirm && next !== confirm && (
                <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={loading || !current || !next || !confirm}
              className="w-full bg-[#F5A623] text-white py-3 rounded-lg font-semibold text-sm hover:bg-[#e8951a] disabled:opacity-50 mt-2"
            >
              {loading ? "변경 중..." : "비밀번호 변경"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
