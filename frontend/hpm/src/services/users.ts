import axios from "axios";
import type { User } from "../types/user";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

export const loginUser = async (credentials: { email: string; password: string }) => {
  const response = await api.post<User>("/users/login/", credentials);
  return response.data;
};

export const getMe = async (): Promise<User> => {
  const response = await api.get<User>("/users/me/");
  console.log(response.data)
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
