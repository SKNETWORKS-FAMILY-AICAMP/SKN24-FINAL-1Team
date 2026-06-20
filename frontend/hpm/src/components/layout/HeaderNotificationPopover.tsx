import { useMemo, useState } from "react";
import checkIcon from "../../assets/header/icon-check.svg";
import {
  HEADER_NOTIFICATION_TABS,
  INITIAL_HEADER_NOTIFICATIONS,
  type HeaderNotification,
  type NotificationTab,
} from "../../constants/header";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

export default function HeaderNotificationPopover() {
  const [activeTab, setActiveTab] = useState<NotificationTab>("전체");
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [notifications, setNotifications] = useState<HeaderNotification[]>(
    INITIAL_HEADER_NOTIFICATIONS,
  );

  const visibleNotifications = useMemo(() => {
    return activeTab === "전체"
      ? notifications
      : notifications.filter((notification) => notification.category === activeTab);
  }, [activeTab, notifications]);

  const handleTabChange = (tab: NotificationTab) => {
    setActiveTab(tab);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: number) => {
    if (!deleteMode) return;

    setSelectedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const handleDeleteClick = () => {
    if (!deleteMode) {
      setDeleteMode(true);
      setSelectedIds(new Set());
      return;
    }

    if (selectedIds.size === 0) {
      setDeleteMode(false);
      return;
    }

    setNotifications((current) =>
      current.filter((notification) => !selectedIds.has(notification.id)),
    );
    setSelectedIds(new Set());
    setDeleteMode(false);
  };

  return (
    <section
      aria-label="알림"
      className="absolute right-0 top-[50px] z-50 h-[431px] w-[352px] overflow-hidden rounded-[12px] border border-[#E6E1E6] bg-[#FFFDFD] shadow-[1px_1px_14px_4px_rgba(230,228,228,0.25)]"
      data-name={deleteMode ? "notification-delete" : "notification"}
    >
      <h2 className="absolute left-[26px] top-[18px] m-0 text-[24px] font-medium leading-[1.2] text-[#141414]">
        알림
      </h2>
      <button
        type="button"
        onClick={handleDeleteClick}
        className="absolute left-[276px] top-[15px] flex h-[24px] w-[61px] items-center justify-center rounded-[5px] border-0 bg-[#623FB5] text-[12px] font-normal leading-[1.2] text-[#FFFDFD] transition-all duration-150 ease-out hover:opacity-90 active:scale-[0.96]"
      >
        삭제
      </button>
      <div className="absolute left-0 top-[55px] h-px w-[352px] bg-[#E6E1E6]" />

      <div className="absolute left-[13px] top-[69px] flex gap-[14px]">
        {HEADER_NOTIFICATION_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabChange(tab)}
            className={cn(
              "flex h-[22px] w-[61px] items-center justify-center rounded-[5px] text-[12px] font-normal leading-[1.2] transition-all duration-150 ease-out active:scale-[0.96]",
              activeTab === tab
                ? "border border-[#623FB5] bg-[#DCD0FE] text-[#623FB5] hover:bg-[#C4B6E5]"
                : "border border-[#969696] bg-[#F4F5F8] text-[#969696] hover:border-[#623FB5] hover:bg-[#ECECF2] hover:text-[#623FB5]",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="absolute left-[14px] top-[107px] flex max-h-[310px] flex-col gap-[10px] overflow-hidden">
        {visibleNotifications.length > 0 ? (
          visibleNotifications.map((notification) => {
            const selected = selectedIds.has(notification.id);

            return (
              <button
                key={notification.id}
                type="button"
                disabled={!deleteMode}
                onClick={() => toggleSelected(notification.id)}
                className="relative h-[70px] w-[324px] shrink-0 rounded-[7px] border border-[#969696] bg-[#F4F5F8] text-left transition-all duration-150 ease-out enabled:hover:border-[#623FB5] enabled:hover:bg-[#ECECF2] enabled:active:scale-[0.99]"
              >
                <span className="absolute left-[15px] top-[15px] text-[12px] font-normal leading-[1.2] text-[#623FB5]">
                  {notification.kind}
                </span>
                <span className="absolute left-[65px] top-[22px] size-[2px] rounded-full bg-[#969696]" />
                <span className="absolute left-[75px] top-[15px] text-[12px] font-normal leading-[1.2] text-[#969696]">
                  {notification.time}
                </span>
                <span className="absolute left-[15px] top-[43px] w-[230px] truncate text-[10px] font-normal leading-[1.2] text-[#141414]">
                  {notification.message}
                </span>
                {deleteMode ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute left-[289px] top-[25px] flex size-[20px] items-center justify-center rounded-full border",
                      selected
                        ? "border-[#623FB5] bg-[#623FB5]"
                        : "border-[#969696] bg-[#FFFDFD]",
                    )}
                  >
                    {selected ? (
                      <img alt="" aria-hidden="true" className="size-[13px] brightness-0 invert" src={checkIcon} />
                    ) : null}
                  </span>
                ) : null}
              </button>
            );
          })
        ) : (
          <div className="flex h-[70px] w-[324px] items-center justify-center rounded-[7px] border border-[#969696] bg-[#F4F5F8] text-[12px] text-[#969696]">
            표시할 알림이 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}
