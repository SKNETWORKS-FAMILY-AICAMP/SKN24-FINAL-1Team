import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as DESIGN from "../../constants/design";
import bell from "../../assets/header/bell.png";
import toggle from "../../assets/header/toggle.png";
import { useAuth } from "../../context/AuthContext";
import type { HeaderPopover } from "../../constants/header";
import HeaderNotificationPopover from "./HeaderNotificationPopover";
import HeaderProfilePopover from "./HeaderProfilePopover";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openPopover, setOpenPopover] = useState<HeaderPopover>(null);

  const togglePopover = (popover: Exclude<HeaderPopover, null>) => {
    setOpenPopover((current) => (current === popover ? null : popover));
  };

  const handleChangePassword = () => {
    setOpenPopover(null);
    navigate("/change-password");
  };

  const handleLogout = () => {
    logout();
    setOpenPopover(null);
    navigate("/login");
  };

  return (
    <header
      className={`w-full h-16 border-b border-[#E6E1E6] ${DESIGN.BACKGROUND_COLORS.white}`}
    >
      <div className="flex h-16 w-full max-w-[1504px] items-center justify-end mx-auto px-6">
        <div className={`flex ${DESIGN.GAP_SIZES["xl"]}`}>
          <div className={`relative flex ${DESIGN.BORDER_COLORS.lightGray} w-[40px] h-[40px] items-center justify-center border-rad rounded-full`}>
            <button
              type="button"
              aria-label="알림"
              onClick={() => togglePopover("notifications")}
            >
              <img src={bell} alt="" />
            </button>
            {openPopover === "notifications" ? <HeaderNotificationPopover /> : null}
          </div>
          <div className={`relative flex items-center justify-center ${DESIGN.BORDER_COLORS.lightGray} ${DESIGN.GAP_SIZES["xl"]} rounded-full ${DESIGN.PADDING_X_SIZES.sm}`}>
            <p>{user?.name}</p>
            <button
              type="button"
              aria-label="프로필 메뉴"
              onClick={() => togglePopover("profile")}
            >
              <img src={toggle} alt="" />
            </button>
            {openPopover === "profile" ? (
              <HeaderProfilePopover
                email={user?.email}
                name={user?.name}
                onChangePassword={handleChangePassword}
                onLogout={handleLogout}
              />
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
