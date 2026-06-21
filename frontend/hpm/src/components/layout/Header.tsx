import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as DESIGN from "../../constants/design";
import bell from "../../assets/header/bell.png";
import toggle from "../../assets/header/toggle.png";
import { useAuth } from "../../context/AuthContext";
import type { HeaderPopover } from "../../constants/header";
import {
  getNotifications,
  getUserProfile,
  type Notification,
  type UserProfile,
} from "../../services/meeting";
import HeaderNotificationPopover from "./HeaderNotificationPopover";
import HeaderProfilePopover from "./HeaderProfilePopover";

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openPopover, setOpenPopover] = useState<HeaderPopover>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setNotificationsLoading(false);
      return;
    }

    setNotificationsLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const loadProfile = useCallback(async () => {
    if (!user?.users_id) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    try {
      const data = await getUserProfile(user.users_id);
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );
  const unreadNotificationLabel =
    unreadNotificationCount > 99 ? "99+" : String(unreadNotificationCount);

  const togglePopover = (popover: Exclude<HeaderPopover, null>) => {
    setOpenPopover((current) => {
      const next = current === popover ? null : popover;
      if (popover === "notifications" && next === "notifications") {
        void loadNotifications();
      }
      if (popover === "profile" && next === "profile") {
        void loadProfile();
      }
      return next;
    });
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
              className="relative flex size-full items-center justify-center"
            >
              <img src={bell} alt="" />
              {unreadNotificationCount > 0 ? (
                <span className="absolute -right-[4px] -top-[5px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#F04438] px-[4px] text-[10px] font-semibold leading-none text-[#FFFDFD]">
                  {unreadNotificationLabel}
                </span>
              ) : null}
            </button>
            {openPopover === "notifications" ? (
              <HeaderNotificationPopover
                loading={notificationsLoading}
                notifications={notifications}
                setNotifications={setNotifications}
              />
            ) : null}
          </div>
          <div className={`relative flex items-center justify-center ${DESIGN.BORDER_COLORS.lightGray} ${DESIGN.GAP_SIZES["xl"]} rounded-full ${DESIGN.PADDING_X_SIZES.sm}`}>
            <p>{user?.name ? `${user.name}님` : ""}</p>
            <button
              type="button"
              aria-label="프로필 메뉴"
              onClick={() => togglePopover("profile")}
            >
              <img src={toggle} alt="" />
            </button>
            {openPopover === "profile" ? (
              <HeaderProfilePopover
                email={profile?.email || user?.email}
                name={profile?.name || user?.name}
                empNo={profile?.emp_no}
                deptName={profile?.dept_name}
                rankName={profile?.rank_name}
                work={profile?.work}
                loading={profileLoading}
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
