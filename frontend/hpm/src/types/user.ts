export interface User {
  users_id: number;
  emp_no: string;
  email: string;
  name: string;
  work: string;
  password?: string;
  account_status: number;
  status: number;
  account_id: string | null;
  role: 'ADMIN' | 'USER';
  created_at: string;
  updated_at: string;
  dept: number;
  rank: number;
}