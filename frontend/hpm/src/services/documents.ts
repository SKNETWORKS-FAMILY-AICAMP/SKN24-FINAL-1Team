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

export const deleteDocument = async (
  projectId: number,
  documentId: number,
): Promise<void> => {
  await api.delete(`/documents/${projectId}/${documentId}/`);
};
