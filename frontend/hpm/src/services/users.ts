import axios from "axios";
import type { User } from "../types/user";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

export const loginUser = async (credentials: { email: string; password: string }): Promise<User> => {
  const response = await api.post<User>("/users/login/", credentials);
  return response.data;
};

export const getUserDetail = async (
  UserId: number
): Promise<User> => {
  const response = await api.get<User>(`/User/${UserId}/`);
  return response.data;
};

export default api;
