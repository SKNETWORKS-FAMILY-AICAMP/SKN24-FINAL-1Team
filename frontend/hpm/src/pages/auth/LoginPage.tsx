import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import * as DESIGN from "../../constants/design";
import { AUTH_ERRORS } from "../../constants/auth";
import api from "../../services/meeting";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import ServiceLogo from "../../components/ui/ServiceLogo";


export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

const handleLogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
  e.preventDefault();

  let hasError = false;
  setEmailError("");
  setPasswordError("");

  if (!email) {
    setEmailError(AUTH_ERRORS.EMAIL_REQUIRED);
    hasError = true;
  }
  if (!password) {
    setPasswordError(AUTH_ERRORS.PASSWORD_REQUIRED);
    hasError = true;
  }

  if (hasError) return;

  setLoading(true);

  try {
    const res = await api.post("/users/login/", { email, password });
    login(res.data);

    if (res.data.account_status === 0) {
      navigate("/change-password");
    } else {
      navigate("/projects");
    }
  } catch {
    setPasswordError(AUTH_ERRORS.INVALID_LOGIN);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className={`${DESIGN.BACKGROUND_COLORS.background} min-h-screen flex justify-center items-center`}>
      <div className="w-[480px]">
        <ServiceLogo/>
        <div className={`${DESIGN.PADDING_SIZES["2xl"]} ${DESIGN.BACKGROUND_COLORS.white} ${DESIGN.MARGIN_TOP_SIZES["5xl"]} ${DESIGN.RADIUS_SIZES["2xl"]} flex justify-center items-center flex-col`}>
          <p className={`${DESIGN.FONT_SIZES.h3} justify-center ${DESIGN.MARGIN_BOTTOM_SIZES["3xl"]}`}>로그인</p>
          <form onSubmit={handleLogin} className={`flex flex-col ${DESIGN.GAP_SIZES["4xl"]} w-full`}>
            <Input
              id="email"
              label="이메일"
              size="md"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError("");
              }}
              placeholder="이메일을 입력해주세요"
              error={emailError}
            />
            <Input
              id="password"
              label="비밀번호"
              size="md"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError("");
              }}
              placeholder="비밀번호를 입력해주세요"
              error={passwordError}
            />

          <Button type="submit" disabled={loading} className="w-full">
            로그인
          </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
