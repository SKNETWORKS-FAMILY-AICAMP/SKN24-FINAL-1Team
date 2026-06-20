export type MeetingReviewPriority = "높음" | "중간" | "낮음";

export interface MeetingReviewMeta {
  title: string;
  dateTime: string;
  author: string;
  location: string;
  participants: string;
}

export interface MeetingReviewTask {
  id: number;
  title: string;
  assignee: string;
  dueDate: string;
  priority: MeetingReviewPriority;
  description: string;
}
