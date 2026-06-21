import type { DocumentRecord } from "../types/documentManagement";

export const ALL_DOCUMENT_FILTER = "전체";
export const EMPTY_UPLOAD_DATE_FILTER = "";
export const DOCUMENT_UPLOAD_DATE_LABEL = "업로드 날짜";
export const DOCUMENT_ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "txt"]);
export const DOCUMENT_MAX_UPLOAD_SIZE = 20 * 1024 * 1024;

export const INITIAL_DOCUMENTS: DocumentRecord[] = [
  {
    id: 1,
    name: "Q3_마케팅전략_기획안.pdf",
    creator: "박수영",
    department: "개발팀",
    uploadedAt: "2026-06-11",
    size: 7.5 * 1024 * 1024,
  },
  {
    id: 2,
    name: "Q3_마케팅전략_기획안.pdf",
    creator: "류지우",
    department: "개발팀",
    uploadedAt: "2026-06-10",
    size: 7.5 * 1024 * 1024,
  },
  {
    id: 3,
    name: "Q3_마케팅전략_기획안.docx",
    creator: "김지원",
    department: "개발팀",
    uploadedAt: "2026-06-09",
    size: 7.5 * 1024 * 1024,
  },
  {
    id: 4,
    name: "Q3_마케팅전략_기획안.docx",
    creator: "김민준",
    department: "개발팀",
    uploadedAt: "2026-06-02",
    size: 7.5 * 1024 * 1024,
  },
  {
    id: 5,
    name: "Q3_마케팅전략_기획안.docx",
    creator: "남윤진",
    department: "개발팀",
    uploadedAt: "2026-05-27",
    size: 7.5 * 1024 * 1024,
  },
  {
    id: 6,
    name: "Q3_마케팅전략_기획안.txt",
    creator: "김은종",
    department: "개발팀",
    uploadedAt: "2026-05-23",
    size: 7.5 * 1024 * 1024,
  },
  {
    id: 7,
    name: "Q3_마케팅전략_기획안.txt",
    creator: "김규호",
    department: "개발팀",
    uploadedAt: "2026-05-15",
    size: 7.5 * 1024 * 1024,
  },
  {
    id: 8,
    name: "Q3_마케팅전략_기획안.txt",
    creator: "김은우",
    department: "개발팀",
    uploadedAt: "2026-05-08",
    size: 7.5 * 1024 * 1024,
  },
  {
    id: 9,
    name: "Q3_마케팅전략_기획안.pdf",
    creator: "강강찬",
    department: "개발팀",
    uploadedAt: "2026-05-05",
    size: 7.5 * 1024 * 1024,
  },
  {
    id: 10,
    name: "Q3_마케팅전략_기획안.docx",
    creator: "김가은",
    department: "개발팀",
    uploadedAt: "2026-05-01",
    size: 7.5 * 1024 * 1024,
  },
  {
    id: 11,
    name: "Q3_마케팅전략_기획안.docx",
    creator: "이성계",
    department: "개발팀",
    uploadedAt: "2026-04-19",
    size: 7.5 * 1024 * 1024,
  },
  {
    id: 12,
    name: "Q3_마케팅전략_기획안.txt",
    creator: "정몽주",
    department: "개발팀",
    uploadedAt: "2026-04-10",
    size: 7.5 * 1024 * 1024,
  },
];
