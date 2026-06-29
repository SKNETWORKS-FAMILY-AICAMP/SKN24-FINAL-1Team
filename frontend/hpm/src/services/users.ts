import axios from "axios";
import type { User } from "../types/user";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
  withXSRFToken: true,
});

export const loginUser = async (credentials: { email: string; password: string }) => {
  const response = await api.post<User>("/users/login/", credentials);
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post("/users/logout/");
  return response.data;
};

export const getMe = async (): Promise<User> => {
  const response = await api.get<User>("/users/me/");
  console.log(response.data)
  return response.data;
};

export const getUsers = async (): Promise<User[]> => {
  const response = await api.get<User[]>("/users/");
  return response.data;
};

export const getUserProjects = async (userId: number) => {
  const response = await api.get(`/users/${userId}/projects/`);
  return response.data;
};

export const getUserDetail = async (userId: number): Promise<User> => {
  const response = await api.get<User>(`/users/${userId}/`);
  return response.data;
};

export const changePassword = async (
  userId: number,
  password: string,
  currentPassword?: string,
): Promise<User> => {
  const payload: { password: string; current_password?: string } = { password };
  if (currentPassword) payload.current_password = currentPassword;

  const response = await api.patch<User>(`/users/${userId}/`, payload);
  return response.data;
};

export default api;


// ── 관리자 전용 API ────────────────────────────────────────────────

export const fetchAdminUsers = async () => {
  const response = await api.get("/admin/users/");
  return response.data;
};

export const createAdminUser = async (data: {
  emp_no: string; name: string; email: string;
  dept_name: string; rank_name: string; work: string;
}) => {
  const response = await api.post("/admin/users/", data);
  return response.data;
};

export const deleteAdminUser = async (userId: number) => {
  await api.delete(`/admin/users/${userId}/`);
};

export const updateAdminUser = async (userId: number, data: {
  name?: string; email?: string; emp_no?: string;
  work?: string; dept_name?: string; rank_name?: string; status?: number;
}) => {
  const response = await api.patch(`/admin/users/${userId}/`, data);
  return response.data;
};

export const resetAdminUserPassword = async (userId: number) => {
  const response = await api.patch(`/admin/users/${userId}/`, { reset_password: true });
  return response.data;
};

export const fetchDepts = async () => {
  const response = await api.get("/admin/depts/");
  return response.data;
};

export const fetchRanks = async () => {
  const response = await api.get("/admin/ranks/");
  return response.data;
};
