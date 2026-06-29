import type { MeetingCompletionContent } from "../types/meetingCompletion";

export const MEETING_COMPLETION_CONTENT: MeetingCompletionContent = {
  steps: [
    { id: "speaker-mapping", label: "발화자 매핑", status: "pending" },
    { id: "minutes-task", label: "회의록 검토 & 태스크 수정", status: "pending" },
    { id: "jira-task", label: "Jira 태스크 등록", status: "active" },
  ],
  title: "JIRA 태스크 등록 및 회의록 생성 완료",
  description: "팀원들에게 공유하시겠습니까?",
  actions: [
    { id: "skip", label: "건너뛰기", variant: "secondary" },
    { id: "confirm", label: "확인", variant: "primary" },
  ],
};
