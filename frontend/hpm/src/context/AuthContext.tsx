import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface User {
  users_id: number;
  name: string;
  email: string;
  is_initial_password?: boolean;
  jira_connected?: boolean;  // 추가
}

interface AuthContextType {
  user: User | null;
  projectId: number | null;
  projectName: string;
  login: (user: User) => void;
  logout: () => void;
  selectProject: (id: number, name: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem("hpm_user") || "null"); } catch { return null; }
  });
  const [projectId, setProjectId] = useState<number | null>(() => {
    const v = localStorage.getItem("hpm_project_id");
    return v ? Number(v) : null;
  });
  const [projectName, setProjectName] = useState(() => localStorage.getItem("hpm_project_name") || "");

  const login = (u: User) => {
    setUser(u);
    localStorage.setItem("hpm_user", JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    setProjectId(null);
    setProjectName("");
    localStorage.removeItem("hpm_user");
    localStorage.removeItem("hpm_project_id");
    localStorage.removeItem("hpm_project_name");
  };

  const selectProject = (id: number, name: string) => {
    setProjectId(id);
    setProjectName(name);
    localStorage.setItem("hpm_project_id", String(id));
    localStorage.setItem("hpm_project_name", name);
  };

  return (
    <AuthContext.Provider value={{ user, projectId, projectName, login, logout, selectProject }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
