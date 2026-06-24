export interface DocumentRecord {
  id: number;
  name: string;
  creator: string;
  creatorRank?: string;
  uploaderId?: number;
  department: string;
  uploadedAt: string;
  size: number;
  fileUrl?: string;
  file?: File;
}

export interface UploadedDocument {
  id: number;
  file: File;
}

export type DocumentCreatorFilter = string;
