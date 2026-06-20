export interface MeetingEmailTask {
  id: number;
  title: string;
  assignee: string;
  dueDate: string;
  priority: string;
}

export interface MeetingEmailRecipient {
  id: string;
  name: string;
  role: string;
  email?: string;
  department?: string;
}

export interface MeetingEmailInfo {
  title: string;
  dateTime: string;
  participants: string;
}

export interface MeetingEmailContent {
  heading: string;
  subheading: string;
  meeting: MeetingEmailInfo;
  tasks: MeetingEmailTask[];
  recipients: MeetingEmailRecipient[];
  recipientOptions: MeetingEmailRecipient[];
}
