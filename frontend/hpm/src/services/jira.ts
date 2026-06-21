import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

// ── 타입 ──────────────────────────────────────────────────────────

export interface JiraIssue {
  issue_key: string;
  title: string;
  assignee: string;
  priority: string;
  due_date: string | null;
}

export interface JiraBoard {
  todo: JiraIssue[];
  progress: JiraIssue[];
  review: JiraIssue[];
  done: JiraIssue[];
}

export interface JiraWorkspace {
  cloud_id: string;
  name: string;
  url: string;
}

export interface JiraProject {
  key: string;
  name: string;
}

// ── Jira 연동 상태 ────────────────────────────────────────────────

export const getJiraStatus = async (): Promise<{ connected: boolean; jira_cloud_id: string | null }> => {
  const res = await api.get("/jira/status/");
  return res.data;
};

// ── 워크스페이스 ──────────────────────────────────────────────────

export const getJiraWorkspaces = async (): Promise<JiraWorkspace[]> => {
  const res = await api.get("/jira/workspaces/");
  return res.data;
};

export const selectJiraWorkspace = async (cloud_id: string): Promise<void> => {
  await api.patch("/jira/select-workspace/", { cloud_id });
};

// ── 프로젝트 키 ───────────────────────────────────────────────────

export const getJiraProjects = async (): Promise<JiraProject[]> => {
  const res = await api.get("/jira/projects/");
  return res.data;
};

export const setJiraProjectKey = async (project_key: string): Promise<void> => {
  await api.patch("/jira/project-key/", { project_key });
};

// ── 칸반 보드 ─────────────────────────────────────────────────────

export const getJiraBoard = async (): Promise<JiraBoard> => {
  const res = await api.get("/jira/board/");
  return res.data;
};

export const updateJiraIssueStatus = async (issue_key: string, column_id: string): Promise<void> => {
  await api.patch(`/jira/board/issue/${issue_key}/status/`, { column_id });
};

export const deleteJiraIssue = async (issue_key: string): Promise<void> => {
  await api.delete(`/jira/board/issue/${issue_key}/`);
};

export const createJiraIssue = async (title: string): Promise<{ issue_key: string }> => {
  const res = await api.post("/jira/board/issue/", { title });
  return res.data;
};

export default api;

