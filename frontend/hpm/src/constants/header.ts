export type HeaderPopover = "notifications" | "profile" | null;

export type NotificationTab = "전체" | "업무" | "프로젝트" | "회의";

export type NotificationCategory = Exclude<NotificationTab, "전체">;

export interface HeaderNotification {
  id: number;
  category: NotificationCategory;
  kind: string;
  time: string;
  message: string;
}

export const HEADER_NOTIFICATION_TABS: NotificationTab[] = [
  "전체",
  "업무",
  "프로젝트",
  "회의",
];

export const INITIAL_HEADER_NOTIFICATIONS: HeaderNotification[] = [
  {
    id: 1,
    category: "회의",
    kind: "회의 초대",
    time: "3분 전",
    message: "금일 13시 35분 17차 4강의실 회의 참석",
  },
  {
    id: 2,
    category: "업무",
    kind: "업무 배정",
    time: "8분 전",
    message: "신규 웹사이트 제작 프로젝트 화면 QA 확인",
  },
  {
    id: 3,
    category: "프로젝트",
    kind: "프로젝트",
    time: "15분 전",
    message: "LG 협력사 서비스 개발 프로젝트가 업데이트되었습니다.",
  },
  {
    id: 4,
    category: "회의",
    kind: "회의 초대",
    time: "24분 전",
    message: "금일 13시 35분 17차 4강의실 회의 참석",
  },
];
