import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DocumentManagementPanel from "../../components/document/DocumentManagementPanel";
import {
  ALL_DOCUMENT_FILTER,
  EMPTY_UPLOAD_DATE_FILTER,
} from "../../constants/documentManagement";
import { useAuth } from "../../context/AuthContext";
import { deleteDocument, getDocuments } from "../../services/documents";
import type { DocumentRecord } from "../../types/documentManagement";

function downloadDocumentFile(item: DocumentRecord) {
  if (item.fileUrl) {
    const link = document.createElement("a");
    link.href = item.fileUrl;
    link.download = item.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }

  const blob =
    item.file ??
    new Blob([`${item.name}\n생성자: ${item.creator}\n업로드 날짜: ${item.uploadedAt}`], {
      type: "text/plain;charset=utf-8",
    });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = item.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function DocumentManagementPage() {
  const navigate = useNavigate();
  const { projectId } = useAuth();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [query, setQuery] = useState("");
  const [creatorFilter, setCreatorFilter] = useState(ALL_DOCUMENT_FILTER);
  const [uploadDateFilter, setUploadDateFilter] = useState(EMPTY_UPLOAD_DATE_FILTER);

  const loadDocuments = useCallback(async () => {
    if (!projectId) {
      setDocuments([]);
      return;
    }

    try {
      const data = await getDocuments(projectId);
      setDocuments(data);
    } catch {
      setDocuments([]);
    }
  }, [projectId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const creators = useMemo(
    () => [ALL_DOCUMENT_FILTER, ...Array.from(new Set(documents.map((item) => item.creator)))],
    [documents],
  );

  const uploadDates = useMemo(
    () => Array.from(new Set(documents.map((item) => item.uploadedAt))).sort().reverse(),
    [documents],
  );

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return documents.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [item.name, item.creator, item.department, item.uploadedAt]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesCreator =
        creatorFilter === ALL_DOCUMENT_FILTER || item.creator === creatorFilter;
      const matchesDate =
        uploadDateFilter === EMPTY_UPLOAD_DATE_FILTER ||
        item.uploadedAt === uploadDateFilter;

      return matchesQuery && matchesCreator && matchesDate;
    });
  }, [creatorFilter, documents, query, uploadDateFilter]);

  const allVisibleSelected =
    filteredDocuments.length > 0 &&
    filteredDocuments.every((item) => selectedIds.has(item.id));

  const toggleSelected = (documentId: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(documentId)) {
        next.delete(documentId);
      } else {
        next.add(documentId);
      }
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (allVisibleSelected) {
        filteredDocuments.forEach((item) => next.delete(item.id));
      } else {
        filteredDocuments.forEach((item) => next.add(item.id));
      }

      return next;
    });
  };

  const deleteSelected = async () => {
    if (!projectId || selectedIds.size === 0) return;

    await Promise.all(
      Array.from(selectedIds).map((documentId) => deleteDocument(projectId, documentId)),
    );
    setSelectedIds(new Set());
    await loadDocuments();
  };

  const downloadSelected = () => {
    documents
      .filter((item) => selectedIds.has(item.id))
      .forEach((item) => downloadDocumentFile(item));
  };

  return (
    <div className="-m-6 min-h-screen overflow-x-hidden bg-[#fffdfd] pt-[64px] font-pretendard">
      <section className="min-h-[1016px] w-full min-w-0 px-[32px] pb-[72px] pt-[47px]">
        <DocumentManagementPanel
          allVisibleSelected={allVisibleSelected}
          creatorFilter={creatorFilter}
          creators={creators}
          documents={filteredDocuments}
          query={query}
          selectedIds={selectedIds}
          uploadDateFilter={uploadDateFilter}
          uploadDates={uploadDates}
          onCreatorFilterChange={setCreatorFilter}
          onDeleteSelected={() => void deleteSelected()}
          onDownloadSelected={downloadSelected}
          onOpenUpload={() => navigate("/documents/upload")}
          onQueryChange={setQuery}
          onToggleAllVisible={toggleAllVisible}
          onToggleSelected={toggleSelected}
          onUploadDateFilterChange={setUploadDateFilter}
        />
      </section>
    </div>
  );
}
