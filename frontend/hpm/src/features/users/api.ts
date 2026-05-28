import axios from "axios";
import type { User } from "../../types/user";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api",
});

export const getUserDetail = async (
  UserId: number
): Promise<User> => {
  const response = await api.get<User>(`/User/${UserId}/`);
  return response.data;
};