import type { MemberInviteCandidate, MemberRecord } from "../types/memberManagement";

export const MEMBER_TABLE_COLUMNS = [
  { key: "name", label: "이름" },
  { key: "email", label: "이메일" },
  { key: "department", label: "부서" },
  { key: "position", label: "직급" },
  { key: "job", label: "직무" },
  { key: "authority", label: "권한" },
] as const;

export const INITIAL_MEMBERS: MemberRecord[] = [
  {
    id: 1,
    name: "류지우",
    email: "jia11234@naver.com",
    department: "개발팀",
    position: "대리",
    job: "백엔드 개발",
    authority: "creator",
  },
  {
    id: 2,
    name: "류지우",
    email: "jia11234@naver.com",
    department: "개발팀",
    position: "대리",
    job: "백엔드 개발",
    authority: "member",
  },
  {
    id: 3,
    name: "류지우",
    email: "jia11234@naver.com",
    department: "개발팀",
    position: "대리",
    job: "백엔드 개발",
    authority: "member",
  },
  {
    id: 4,
    name: "류지우",
    email: "jia11234@naver.com",
    department: "개발팀",
    position: "대리",
    job: "백엔드 개발",
    authority: "member",
  },
  {
    id: 5,
    name: "류지우",
    email: "jia11234@naver.com",
    department: "개발팀",
    position: "대리",
    job: "백엔드 개발",
    authority: "member",
  },
  {
    id: 6,
    name: "류지우",
    email: "jia11234@naver.com",
    department: "개발팀",
    position: "대리",
    job: "백엔드 개발",
    authority: "member",
  },
];

export const MEMBER_INVITE_CANDIDATES: MemberInviteCandidate[] = [
  {
    id: 1,
    name: "김규호",
    role: "부장",
    email: "kkh@company.com",
    department: "개발 1팀",
  },
  {
    id: 2,
    name: "김지호",
    role: "부장",
    email: "kkh@company.com",
    department: "개발 1팀",
  },
  {
    id: 3,
    name: "김교호",
    role: "부장",
    email: "kkh@company.com",
    department: "개발 1팀",
  },
  {
    id: 4,
    name: "김호",
    role: "부장",
    email: "kkh@company.com",
    department: "개발 1팀",
  },
];
