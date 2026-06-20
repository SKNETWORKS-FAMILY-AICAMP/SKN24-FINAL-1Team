import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DocumentUploadPanel from "../../components/document/DocumentUploadPanel";
import {
  DOCUMENT_ALLOWED_EXTENSIONS,
  DOCUMENT_MAX_UPLOAD_SIZE,
} from "../../constants/documentManagement";
import { useDocumentManagement } from "../../context/DocumentManagementContext";
import type { UploadedDocument } from "../../types/documentManagement";

const getExtension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

export default function DocumentUploadPage() {
  const navigate = useNavigate();
  const { addUploadedDocuments } = useDocumentManagement();
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [uploadMessage, setUploadMessage] = useState("");

  const addUploadFiles = (files: File[]) => {
    const validFiles = files.filter(
      (file) =>
        DOCUMENT_ALLOWED_EXTENSIONS.has(getExtension(file.name)) &&
        file.size <= DOCUMENT_MAX_UPLOAD_SIZE,
    );

    if (validFiles.length !== files.length) {
      setUploadMessage("PDF, DOCX, TXT 파일만 업로드할 수 있고 파일당 최대 1GB입니다.");
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

  const completeUpload = () => {
    addUploadedDocuments(uploadedDocuments);
    navigate("/documents");
  };

  return (
    <div className="-m-6 min-h-screen overflow-x-hidden bg-[#fffdfd] pt-[64px] font-pretendard">
      <section className="min-h-[1016px] w-full min-w-0 px-[32px] pb-[72px] pt-[64px]">
        <DocumentUploadPanel
          uploadMessage={uploadMessage}
          uploadedDocuments={uploadedDocuments}
          onAddFiles={addUploadFiles}
          onBack={() => navigate("/documents")}
          onComplete={completeUpload}
          onRemoveUploadedDocument={removeUploadedDocument}
        />
      </section>
    </div>
  );
}
