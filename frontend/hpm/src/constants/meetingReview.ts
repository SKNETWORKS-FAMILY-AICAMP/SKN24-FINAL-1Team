import type { SpeakerMappingStep } from "../types/speakerMapping";
import type { MeetingReviewMeta, MeetingReviewTask } from "../types/meetingReview";

export const MEETING_REVIEW_STEPS: SpeakerMappingStep[] = [
  { id: "speaker-mapping", label: "발화자 매핑", status: "pending" },
  { id: "minutes-task", label: "회의록 검토 & 태스크 수정", status: "active" },
  { id: "jira-task", label: "Jira 태스크 등록", status: "pending" },
];

export const MEETING_REVIEW_META: MeetingReviewMeta = {
  title: "AI 매칭 엔진 고도화 및 포털 개편 진행 상황 점검 회의",
  dateTime: "2025년 5월 29일 9:00",
  author: "박수영",
  location: "대륭 17차 18층",
  participants: "김규호, 김지원, 류지우, 박수영, 황인규",
};

export const MEETING_REVIEW_MINUTES = [
  "AI 매칭 엔진 고도화 및 포털 개편 관련 회의",
  "1. AI 매칭 엔진 고도화 현황",
  "  - 기존 키워드 매칭에서 임베딩 기반 시맨틱 매칭으로 전환 중.",
  "  - 프로토타입 결과: Top 5 적합 공급기업 포함률 기존 대비 약 23% 개선.",
  "  - 결정 사항: 우선 1차(LLM 리라이팅) 방식으로 진행, 파인튜닝은 2차로 추진.",
  "2. 보안 및 인프라 검토",
  "  - 운영 서버에서 외부 API(LLM) 호출 시 보안 정책 준수 여부 확인 필요.",
  "3. 포털 프론트엔드 개편 및 기타 안건",
  "  - 수요기업 온보딩 플로우 내 업종 코드 자동 분류 기능 추가 요청 접수.",
].join("\n");

export const MEETING_REVIEW_ASSIGNEES = ["김규호", "김지원", "류지우", "박수영", "황인규"];

export const MEETING_REVIEW_PRIORITIES = ["높음", "중간", "낮음"] as const;

export const INITIAL_MEETING_REVIEW_TASKS: MeetingReviewTask[] = [
  {
    id: 1,
    title: "사내 클라우드 보호처 신청 절차 및 예산 코드 확인",
    assignee: "김규호",
    dueDate: "2026-06-18",
    priority: "높음",
    description: "파인튜닝용 GPU 서버 확보를 위해 사내 클라우드 보호처 신청 절차와 관련된 예산 코드 적정성을 확인하여 보고",
  },
  {
    id: 2,
    title: "운영 서버 외부 API 호출 보안 정책 확인",
    assignee: "김규호",
    dueDate: "2026-06-05",
    priority: "높음",
    description: "LLM 리라이팅 방식 도입 시 운영 서버에서 외부 API를 호출하는 것이 보안팀 규정상 허용되는지 확인 요청",
  },
  {
    id: 3,
    title: "수요기업 온보딩 플로우 추가 기능 범위 검토",
    assignee: "류지우",
    dueDate: "2026-06-05",
    priority: "중간",
    description: "업종 코드 자동 분류 기능이 RFP 범위에 포함되는지 여부 확인 후 가입 변경 심의위원회 상정 여부 결정",
  },
];
