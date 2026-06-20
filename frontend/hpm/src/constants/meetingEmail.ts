import type { MeetingEmailContent } from "../types/meetingEmail";

export const MEETING_EMAIL_CONTENT: MeetingEmailContent = {
  heading: "이메일 확인",
  subheading: "발송 전 이메일을 확인해주세요",
  meeting: {
    title: "2026 하반기 신규 서비스 런칭 전략 논의",
    dateTime: "2026-06-12 (금) 10:00 ~ 11:30",
    participants: "류지호, 김하늘, 박서준, 이지수, 최민재 (총 5명)",
  },
  tasks: [
    {
      id: 1,
      title: "서비스 런칭 일정 초안 작성",
      assignee: "김하늘",
      dueDate: "2026-06-03 (수)",
      priority: "높음",
    },
    {
      id: 2,
      title: "주요 타겟 고객 페르소나 정의",
      assignee: "이지수",
      dueDate: "2026-06-04 (목)",
      priority: "높음",
    },
    {
      id: 3,
      title: "경쟁사 분석 리포트 정리",
      assignee: "박서준",
      dueDate: "2026-06-05 (금)",
      priority: "높음",
    },
    {
      id: 4,
      title: "예산 계획(안) 검토 및 의견",
      assignee: "최민재",
      dueDate: "2026-06-05 (금)",
      priority: "높음",
    },
    {
      id: 5,
      title: "리스크 및 대응 방안 도출",
      assignee: "류지호",
      dueDate: "2026-06-08 (월)",
      priority: "높음",
    },
  ],
  recipients: [
    { id: "kim-kyuho-1", name: "김규호", role: "부장" },
    { id: "kim-kyuho-2", name: "김규호", role: "부장" },
    { id: "kim-kyuho-3", name: "김규호", role: "부장" },
    { id: "kim-kyuho-4", name: "김규호", role: "부장" },
  ],
  recipientOptions: [
    {
      id: "kim-haneul",
      name: "김하늘",
      role: "대리",
      email: "haneul.kim@company.com",
      department: "개발 1팀",
    },
    {
      id: "lee-jisu",
      name: "이지수",
      role: "사원",
      email: "jisu.lee@company.com",
      department: "전략 기획실",
    },
    {
      id: "park-seojun",
      name: "박서준",
      role: "과장",
      email: "seojun.park@company.com",
      department: "마케팅 팀",
    },
    {
      id: "choi-minjae",
      name: "최민재",
      role: "책임",
      email: "minjae.choi@company.com",
      department: "PM",
    },
    {
      id: "ryu-jiho",
      name: "류지호",
      role: "팀장",
      email: "jiho.ryu@company.com",
      department: "QA팀",
    },
    {
      id: "kim-kyuho",
      name: "김규호",
      role: "부장",
      email: "kyuho.kim@company.com",
      department: "개발 1팀",
    },
  ],
};
