export interface User {
  user_id?: number;
  users_id?: number;
  email: string;
  name?: string;
  is_initial_password?: boolean;
  jira_connected?: boolean; 
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean; // 화면 깜빡임 방지용 로딩 상태
  projectId: number | null;
  projectName: string;
  login: (user: User) => void;
  logout: () => void;
  selectProject: (id: number, name: string) => void;
}
