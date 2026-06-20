import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ServiceLogo from "../../components/ui/ServiceLogo"
import api from "../../services/meeting";
import * as DESIGN from "../../constants/design";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/button";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [currentError, setCurrentError] = useState("");
  const [nextError, setNextError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCurrentError("");
    setNextError("");
    setConfirmError("");

    let hasError = false;

    if (!current) {
      setCurrentError("기존 비밀번호를 입력하세요.");
      hasError = true;
    }
    if (next.length < 6) {
      setNextError("새 비밀번호는 6자 이상이어야 합니다.");
      hasError = true;
    }
    if (next !== confirm) {
      setConfirmError("새 비밀번호가 일치하지 않습니다.");
      hasError = true;
    }

    if (hasError) return;

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
    <div className={`${DESIGN.BACKGROUND_COLORS.background} min-h-screen flex justify-center items-center`}>
      <div className="w-[480px]">
        <ServiceLogo/>
        <div className={`${DESIGN.PADDING_SIZES["2xl"]} ${DESIGN.BACKGROUND_COLORS.white} ${DESIGN.MARGIN_TOP_SIZES["5xl"]} ${DESIGN.RADIUS_SIZES["2xl"]} flex justify-center items-center flex-col`}>
          <p className={`${DESIGN.FONT_SIZES.h3} justify-center ${DESIGN.MARGIN_BOTTOM_SIZES["3xl"]}`}>비밀번호 변경</p>
          <form onSubmit={handleSubmit} className={`flex flex-col ${DESIGN.GAP_SIZES["4xl"]} w-full`}>
            <Input
              id="currentPassword"
              label="기존 비밀번호"
              type="password"
              value={current}
              onChange={e => {
                setCurrent(e.target.value);
                if (currentError) setCurrentError("");
              }}
              placeholder="기존 비밀번호를 입력하세요"
              error={currentError}
            />
            <Input
              id="newPassword"
              label="새 비밀번호"
              type="password"
              value={next}
              onChange={e => {
                setNext(e.target.value);
                if (nextError) setNextError("");
              }}
              placeholder="새 비밀번호를 입력하세요 (6자 이상)"
              error={nextError}
            />
            <Input
              id="confirmPassword"
              label="비밀번호 재확인"
              type="password"
              value={confirm}
              onChange={e => {
                setConfirm(e.target.value);
                if (confirmError) setConfirmError("");
              }}
              placeholder="새 비밀번호를 다시 입력하세요"
              error={confirmError}
            />

            {error && (
              <p className="text-red-500 text-sm text-center -mt-4 mb-2">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !current || !next || !confirm}
              buttonClassName="w-full"
            >
              {loading ? "변경 중..." : "비밀번호 변경"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
