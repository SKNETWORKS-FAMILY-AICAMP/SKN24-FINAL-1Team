export interface MeetingJiraTask {
  id: number;
  title: string;
  assignee: string;
  dueDate: string;
  priority: string;
  selected: boolean;
}

export interface MeetingJiraContent {
  heading: string;
  subheading: string;
  instruction: string;
  tasks: MeetingJiraTask[];
}
