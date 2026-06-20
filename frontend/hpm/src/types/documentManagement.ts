export interface DocumentRecord {
  id: number;
  name: string;
  creator: string;
  department: string;
  uploadedAt: string;
  size: number;
  file?: File;
}

export interface UploadedDocument {
  id: number;
  file: File;
}

export type DocumentCreatorFilter = string;
export type DocumentUploadDateFilter = string;
