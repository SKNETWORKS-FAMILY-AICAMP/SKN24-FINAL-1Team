import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DocumentUploadPanel from "../../components/document/DocumentUploadPanel";
import {
  DOCUMENT_ALLOWED_EXTENSIONS,
  DOCUMENT_MAX_UPLOAD_SIZE,
} from "../../constants/documentManagement";
import { useAuth } from "../../context/AuthContext";
import { uploadDocuments } from "../../services/documents";
import type { UploadedDocument } from "../../types/documentManagement";

const getExtension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

export default function DocumentUploadPage() {
  const navigate = useNavigate();
  const { projectId } = useAuth();
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [uploadMessage, setUploadMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const addUploadFiles = (files: File[]) => {
    const validFiles = files.filter(
      (file) =>
        DOCUMENT_ALLOWED_EXTENSIONS.has(getExtension(file.name)) &&
        file.size <= DOCUMENT_MAX_UPLOAD_SIZE,
    );

    if (validFiles.length !== files.length) {
      setUploadMessage("PDF, DOCX, TXT 파일만 업로드할 수 있고 파일은 최대 20MB입니다.");
    } else {
      setUploadMessage("");
    }

    if (validFiles.length === 0) {
      return;
    }

    setUploadedDocuments((current) => [
      ...current,
      ...validFiles.map((file, index) => ({
        id: Date.now() + index,
        file,
      })),
    ]);
  };

  const removeUploadedDocument = (documentId: number) => {
    setUploadedDocuments((current) => current.filter((item) => item.id !== documentId));
    setUploadMessage("");
  };

  const completeUpload = async () => {
    if (!projectId) {
      setUploadMessage("프로젝트를 먼저 선택해야 합니다.");
      return;
    }
    if (uploadedDocuments.length === 0 || submitting) return;

    setSubmitting(true);
    try {
      const result = await uploadDocuments(
        projectId,
        uploadedDocuments.map((item) => item.file),
      );

      if (result.errors.length > 0 && result.created.length === 0) {
        setUploadMessage(result.errors.map((item) => `${item.file}: ${item.error}`).join(", "));
        return;
      }

      navigate("/documents");
    } catch {
      setUploadMessage("문서 업로드에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="-m-6 min-h-screen overflow-x-hidden bg-[#fffdfd] pt-[64px] font-pretendard">
      <section className="min-h-[1016px] w-full min-w-0 px-[32px] pb-[72px] pt-[64px]">
        <DocumentUploadPanel
          uploadMessage={uploadMessage}
          uploadedDocuments={uploadedDocuments}
          submitting={submitting}
          onAddFiles={addUploadFiles}
          onBack={() => navigate("/documents")}
          onComplete={() => void completeUpload()}
          onRemoveUploadedDocument={removeUploadedDocument}
        />
      </section>
    </div>
  );
}
