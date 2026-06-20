export type MemberAuthority = "creator" | "member";

export interface MemberRecord {
  id: number;
  name: string;
  email: string;
  department: string;
  position: string;
  job: string;
  authority: MemberAuthority;
}

export interface MemberInviteCandidate {
  id: string;
  name: string;
  role: string;
  email: string;
  department: string;
}
