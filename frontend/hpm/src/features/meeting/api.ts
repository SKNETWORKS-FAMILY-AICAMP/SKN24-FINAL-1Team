import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// ── 타입 ──────────────────────────────────────────────────────────
export interface AgendaItem {
  agenda_id?: number;
  content: string;
  reason: string;
  is_confirmed?: boolean;
}

export interface Task {
  meeting_task_id: number;
  title: string;
  content: string;
  owner: string;
  due_date: string | null;
  priority: string;
  status: number;
  is_jira_synced?: boolean;
  jira_key?: string;
}

export interface Meeting {
  meeting_id: number;
  title: string;
  location: string;
  meeting_at: string;
  end_at: string;
  status: "scheduled" | "in_progress" | "finished";
  minutes_status: "draft" | "reviewing" | "approved" | "rejected" | null;
  meeting_document: string | null;
  is_meeting: boolean;
  project: number;
  participants?: { user_id: number; name: string }[];
  agenda?: AgendaItem[];
  tasks?: Task[];
}

export interface MeetingCreatePayload {
  project_id: number;
  title: string;
  location: string;
  meeting_at: string;
  end_at: string;
  participants: number[];
}

// ── 회의 ──────────────────────────────────────────────────────────
export const getMeetingList = async (project_id?: number): Promise<Meeting[]> => {
  const params = project_id ? { project_id } : {};
  const res = await api.get("/meetings/", { params });
  return res.data;
};

export const getMeetingDetail = async (meetingId: number): Promise<Meeting> => {
  const res = await api.get(`/meetings/${meetingId}/`);
  return res.data;
};

export const createMeeting = async (payload: MeetingCreatePayload): Promise<Meeting> => {
  const res = await api.post("/meetings/", payload);
  return res.data;
};

export const startMeeting = async (meetingId: number): Promise<void> => {
  await api.post(`/meetings/${meetingId}/start/`);
};

export const endMeeting = async (meetingId: number, audio?: File): Promise<{ minutes_data: { content: string; todo_list: Task[] } }> => {
  const formData = new FormData();
  if (audio) formData.append("audio", audio);
  const res = await api.post(`/meetings/${meetingId}/end/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 600000,
  });
  return res.data;
};

// ── 기초 안건 ──────────────────────────────────────────────────────
export const getAgendaList = async (meetingId: number): Promise<AgendaItem[]> => {
  const res = await api.get(`/meetings/${meetingId}/agenda/`);
  return res.data;
};

export const saveAgendaList = async (meetingId: number, agenda: { title: string; reason: string }[]): Promise<AgendaItem[]> => {
  const res = await api.post(`/meetings/${meetingId}/agenda/`, { agenda });
  return res.data;
};

export const confirmAgenda = async (meetingId: number): Promise<void> => {
  await api.post(`/meetings/${meetingId}/agenda/confirm/`);
};

// ── 회의록 승인 플로우 ─────────────────────────────────────────────
export const requestMinutesApproval = async (meetingId: number): Promise<void> => {
  await api.post(`/meetings/${meetingId}/minutes/request/`);
};

export const approveMinutes = async (meetingId: number): Promise<void> => {
  await api.post(`/meetings/${meetingId}/minutes/approve/`);
};

export const rejectMinutes = async (meetingId: number): Promise<void> => {
  await api.post(`/meetings/${meetingId}/minutes/reject/`);
};

// ── 태스크 ────────────────────────────────────────────────────────
export const getTaskList = async (meetingId: number): Promise<Task[]> => {
  const res = await api.get(`/meetings/${meetingId}/tasks/`);
  return res.data;
};

export const updateTask = async (meetingId: number, taskId: number, data: Partial<Task>): Promise<Task> => {
  const res = await api.patch(`/meetings/${meetingId}/tasks/${taskId}/`, data);
  return res.data;
};

// ── Jira 등록 ─────────────────────────────────────────────────────
export const registerJiraTasks = async (meetingId: number, taskIds: number[]): Promise<{ registered: { task_id: number; jira_key: string }[]; failed: unknown[] }> => {
  const res = await api.post(`/meetings/${meetingId}/jira/`, { task_ids: taskIds });
  return res.data;
};

// ── 챗봇 ─────────────────────────────────────────────────────────
export const sendChatMessage = async (meetingId: number, query: string): Promise<{ answer: string; sources?: string[] }> => {
  const res = await api.post("/chatbot/", { meeting_id: meetingId, query });
  return res.data;
};

// ── 유저 ─────────────────────────────────────────────────────────
export const getUserList = async (): Promise<{ users_id: number; name: string; email: string }[]> => {
  const res = await api.get("/users/");
  return res.data;
};

export default api;

// ── 알림 ─────────────────────────────────────────────────────────
export const getNotifications = async (userId: number) => {
  const res = await api.get(`/notifications/?user_id=${userId}`);
  return res.data;
};

export const markNotificationRead = async (notifId: number) => {
  await api.patch(`/notifications/${notifId}/read/`);
};

// ── 프로젝트 ─────────────────────────────────────────────────────
export const getProjects = async () => {
  const res = await api.get("/projects/");
  return res.data;
};

export const createProject = async (data: { name: string; description: string }) => {
  const res = await api.post("/projects/", data);
  return res.data;
};

// ── OCR서버 -> 텍스트 추출 -> ocr텍스트 + 회의 제목 -> 안건 생성 ─────────────────────────────────────────────────────
export const generateAgendaWithOcr = async (
  meetingId: number,
  file: File | null
): Promise<{ ocr_text: string; agenda: AgendaItem[] }> => {
  const formData = new FormData();
  if (file) formData.append("file", file);

  const res = await api.post(`/meetings/${meetingId}/agenda/generate/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 300000,
  });
  return res.data;
};