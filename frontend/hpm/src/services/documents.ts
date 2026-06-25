import api from "./meeting";
import type { DocumentRecord } from "../types/documentManagement";

export interface DocumentUploadError {
  file: string;
  error: string;
}

export interface DocumentUploadResponse {
  created: DocumentRecord[];
  errors: DocumentUploadError[];
}

export interface DocumentIngestStartResponse {
  document_ids: number[];
  ingest_job_id: string;
  ingest_status?: string;
}

export interface DocumentIngestStatusResponse {
  status: "processing" | "completed" | "failed";
  job_id: string;
  error?: string;
  result?: unknown;
  raw_status?: string;
  step?: string;
}

export interface UploadConfig {
  max_files: number;
  max_size_mb: number;
  allowed_formats: string[];
  messages: {
    entry: string;
    size_exceeded: string;
    unsupported_format: string;
  };
}

export const getUploadConfig = async (): Promise<UploadConfig> => {
  const res = await api.get("/documents/upload-config/");
  return res.data;
};

export const getDocuments = async (projectId: number): Promise<DocumentRecord[]> => {
  const res = await api.get(`/documents/${projectId}/`);
  return res.data;
};

export const uploadDocuments = async (
  projectId: number,
  files: File[],
): Promise<DocumentUploadResponse> => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const res = await api.post(`/documents/${projectId}/`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const startDocumentIngest = async (
  projectId: number,
  documentIds: number[],
): Promise<DocumentIngestStartResponse> => {
  const res = await api.post(
    `/documents/${projectId}/ingest/`,
    { document_ids: documentIds },
    { timeout: 300000 },
  );
  return res.data;
};

export const getDocumentIngestStatus = async (
  projectId: number,
  jobId: string,
): Promise<DocumentIngestStatusResponse> => {
  const res = await api.get(`/documents/${projectId}/ingest/status/`, {
    params: { job_id: jobId },
    timeout: 120000,
  });
  return res.data;
};

export const deleteDocument = async (
  projectId: number,
  documentId: number,
): Promise<void> => {
  await api.delete(`/documents/${projectId}/${documentId}/`);
};
