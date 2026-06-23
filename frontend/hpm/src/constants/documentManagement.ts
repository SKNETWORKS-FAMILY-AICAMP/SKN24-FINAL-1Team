export const ALL_DOCUMENT_FILTER = "전체";
export const DOCUMENT_ALLOWED_EXTENSIONS = new Set(["pdf", "docx", "txt"]);
export const DOCUMENT_MAX_UPLOAD_SIZE = 20 * 1024 * 1024;
export const UPLOAD_PERIOD_OPTIONS = ["전체", "1주일", "1개월", "3개월", "6개월", "1년"] as const;
export const SORT_OPTIONS = ["전체", "내림차순", "오름차순"] as const;
export const PERIOD_DAYS: Record<string, number> = {
  "1주일": 7,
  "1개월": 30,
  "3개월": 90,
  "6개월": 180,
  "1년": 365,
};
