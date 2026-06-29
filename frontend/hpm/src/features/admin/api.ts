import axios, { AxiosError } from 'axios';
import { useAuthStore } from "../../constants/auth";
import type { User } from "../../types/user"; 

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
  withXSRFToken: true,
}); 

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      console.log("1. 401 에러 감지 성공");
      const isLoginRequest = error.config?.url?.includes('/login');
      
      if (!isLoginRequest) {
        console.log("2. 로그인 요청 아님 확인, 모달 오픈 함수 실행");
        useAuthStore.getState().openLoginModal();
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export const getUserDetail = async (
  UserId: number
): Promise<User> => {
  const response = await api.get<User>(`/User/${UserId}/`);
  return response.data;
};
