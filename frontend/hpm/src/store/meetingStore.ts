// src/store/meetingStore.ts
// React Context 기반 전역 상태 (zustand 없이 구현)

export interface AgendaItem {
  id: number;
  title: string;
  reason: string;
}

export interface Meeting {
  meeting_id: number;
  title: string;
  location: string;
  meeting_at: string;   // "2025-06-10T14:00"
  end_at: string;
  participants: string[];
  status: 'scheduled' | 'in_progress' | 'finished';
  hasAgenda: boolean;
  agenda: AgendaItem[];
  minutesStatus: 'draft' | 'reviewing' | 'approved' | 'rejected' | null;
}

export interface Notification {
  id: number;
  type: 'approval_request' | 'approved' | 'rejected';
  message: string;
  meetingId: number;
  isRead: boolean;
  createdAt: string;
}

// 초기 더미 데이터
export const INITIAL_MEETINGS: Meeting[] = [
  {
    meeting_id: 1,
    title: '2025 Q3 제품 로드맵 검토',
    location: '3층 대회의실',
    meeting_at: '2025-06-10T14:00',
    end_at: '2025-06-10T16:00',
    participants: ['김민준', '김지원', '김규호', '류지우'],
    status: 'scheduled',
    hasAgenda: true,
    agenda: [
      { id: 1, title: 'Q3 로드맵 우선순위 확정', reason: 'API 성능 개선과 외부 파트너 연동 스펙 확정을 1순위로 검토.' },
      { id: 2, title: 'A/B 테스트 방향 결정', reason: '모바일 우선 적용 후 2주 데이터 수집 뒤 PC 확장 여부 결정.' },
      { id: 3, title: '외부 파트너 API 연동 스펙 검토', reason: '4차 회의 미결 상태였던 인증 방식(OAuth 2.0) 및 Rate Limit 기준 최종 확정 예정.' },
      { id: 4, title: 'Q2 액션 아이템 이행 현황 점검', reason: '미완료 3건에 대한 담당자 현황 보고 및 기한 재조정 논의.' },
    ],
    minutesStatus: null,
  },
];

// localStorage 기반 간단 스토어
const STORE_KEY = 'hpm_meetings';
const NOTIF_KEY = 'hpm_notifications';

export function getMeetings(): Meeting[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : INITIAL_MEETINGS;
  } catch {
    return INITIAL_MEETINGS;
  }
}

export function saveMeetings(meetings: Meeting[]) {
  localStorage.setItem(STORE_KEY, JSON.stringify(meetings));
}

export function getMeetingById(id: number): Meeting | undefined {
  return getMeetings().find(m => m.meeting_id === id);
}

export function updateMeeting(updated: Meeting) {
  const meetings = getMeetings();
  const idx = meetings.findIndex(m => m.meeting_id === updated.meeting_id);
  if (idx !== -1) {
    meetings[idx] = updated;
  } else {
    meetings.push(updated);
  }
  saveMeetings(meetings);
}

export function addMeeting(meeting: Meeting) {
  const meetings = getMeetings();
  meetings.unshift(meeting);
  saveMeetings(meetings);
}

// 알림
export function getNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addNotification(notif: Omit<Notification, 'id' | 'createdAt'>) {
  const list = getNotifications();
  list.unshift({
    ...notif,
    id: Date.now(),
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(NOTIF_KEY, JSON.stringify(list));
}

export function markNotificationRead(id: number) {
  const list = getNotifications().map(n => n.id === id ? { ...n, isRead: true } : n);
  localStorage.setItem(NOTIF_KEY, JSON.stringify(list));
}
