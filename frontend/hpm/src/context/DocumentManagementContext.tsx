import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { INITIAL_DOCUMENTS } from "../constants/documentManagement";
import type { DocumentRecord, UploadedDocument } from "../types/documentManagement";

interface DocumentManagementContextValue {
  documents: DocumentRecord[];
  addUploadedDocuments: (uploadedDocuments: UploadedDocument[]) => void;
  deleteDocuments: (documentIds: Set<number>) => void;
}

const DocumentManagementContext =
  createContext<DocumentManagementContextValue | null>(null);

export function DocumentManagementProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<DocumentRecord[]>(INITIAL_DOCUMENTS);

  const addUploadedDocuments = (uploadedDocuments: UploadedDocument[]) => {
    if (uploadedDocuments.length === 0) {
      return;
    }

    setDocuments((current) => {
      const nextId = Math.max(0, ...current.map((item) => item.id)) + 1;
      const uploadedAt = "2026-06-19";
      const newDocuments = uploadedDocuments.map((item, index) => ({
        id: nextId + index,
        name: item.file.name,
        creator: "류지우",
        department: "개발팀",
        uploadedAt,
        size: item.file.size,
        file: item.file,
      }));

      return [...newDocuments, ...current];
    });
  };

  const deleteDocuments = (documentIds: Set<number>) => {
    setDocuments((current) => current.filter((item) => !documentIds.has(item.id)));
  };

  return (
    <DocumentManagementContext.Provider
      value={{ documents, addUploadedDocuments, deleteDocuments }}
    >
      {children}
    </DocumentManagementContext.Provider>
  );
}

export function useDocumentManagement() {
  const context = useContext(DocumentManagementContext);

  if (!context) {
    throw new Error(
      "useDocumentManagement must be used within DocumentManagementProvider",
    );
  }

  return context;
}
