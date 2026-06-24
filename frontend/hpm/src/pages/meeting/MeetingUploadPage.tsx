import { useRef, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { generateAgendaWithOcr, generatePrepMaterial } from "../../services/meeting";

const MAX_TOTAL_MB = 5;
const ACCEPTED = ".jpg,.jpeg,.png,.pdf";

const formatSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
  }
  return `${(bytes / 1024).toFixed(0)}kb`;
};

export default function MeetingUploadPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const meetingId = Number(id);
  const { showAgenda = false, showPrepMaterial = false, type = "agenda", projectId } =
    (location.state as { showAgenda?: boolean; showPrepMaterial?: boolean; type?: "agenda" | "prep"; projectId?: number }) ?? {};

  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const totalMb = totalBytes / (1024 * 1024);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;

    if (files.length > 0 || incoming.length > 1) {
      setErrorMessage("파일은 최대 1개만 업로드할 수 있습니다.");
      setShowErrorModal(true);
      return;
    }

    const file = incoming[0];
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["jpg", "jpeg", "png", "pdf"].includes(ext)) {
      setErrorMessage("지원되지 않는 파일 형식입니다.\n(JPG, JPEG, PNG, PDF만 가능)");
      setShowErrorModal(true);
      return;
    }

    if (file.size > MAX_TOTAL_MB * 1024 * 1024) {
      setErrorMessage(`파일 크기는 최대 ${MAX_TOTAL_MB}MB까지 업로드 가능합니다.`);
      setShowErrorModal(true);
      return;
    }

    setFiles([file]);
  };

  const removeFile = (name: string) => setFiles((prev) => prev.filter((f) => f.name !== name));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const handleNext = async () => {
    if (uploading) return;
    setUploading(true);
    try {
      if (files.length > 0) {
        if (type === "prep") {
          await generatePrepMaterial(meetingId, files[0]);
        } else {
          await generateAgendaWithOcr(meetingId, files[0]);
        }
      } else if (type === "prep") {
        await generatePrepMaterial(meetingId, null);
      }
    } catch (e) {
      const msg = (e as { response?: { data?: { error?: string } } }).response?.data?.error ?? "업로드 중 오류가 발생했습니다.";
      setErrorMessage(msg);
      setShowErrorModal(true);
      setUploading(false);
      return;
    } finally {
      setUploading(false);
    }

    navigate(`/meetings/${meetingId}`, {
      state: { showAgenda, showPrepMaterial },
    });
  };

  const handleSkip = async () => {
    if (uploading) return;
    setUploading(true);
    try {
      if (type === "prep") {
        await generatePrepMaterial(meetingId, null);
      } else {
        await generateAgendaWithOcr(meetingId, null);
      }
    } catch (e) {
      console.error("동작 처리 실패:", e);
    } finally {
      setUploading(false);
    }

    navigate(`/meetings/${meetingId}`, {
      state: { showAgenda, showPrepMaterial },
    });
  };

  return (
    <div className="max-w-4xl mx-auto w-full py-10 px-6">
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl w-80 overflow-hidden shadow-xl">
            <div className="px-8 py-10 text-center">
              <p className="text-[#623FB5] text-[14px] leading-relaxed whitespace-pre-line">{errorMessage}</p>
            </div>
            <div className="border-t border-gray-200">
              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full py-4 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
      <h2 className="text-[24px] font-bold text-[#141414] mb-2">
        자료 업로드
      </h2>
      <p className="text-[12px] text-[#969696] mb-8 leading-relaxed">
        관련 자료를 업로드하여 더 정확한 자료를 생성해 보세요.<br />
        자료 없이도 생성 가능하며, 업로드 시 더욱 정교한 결과물을 받을 수 있습니다.
      </p>

      {/* 바깥 큰 카드 */}
      <div className="bg-[#F4F5F8] rounded-[12px] border border-[#E6E1E6] p-6">
        <div className="flex gap-6 min-h-[300px]">

          {/* 드롭존 */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`flex-1 bg-[#FFFDFD] border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition
              ${dragging ? "border-[#623FB5] bg-[#623FB5]/5" : "border-gray-300 hover:border-[#623FB5]"}`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={(e) => addFiles(e.target.files)}
            />
            <svg
              width="48" height="48" viewBox="0 0 24 24" fill="none"
              className="mb-4 text-[#141414]"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p className="text-[12px] text-[#141414] mb-1">
              파일을 드래그하거나 클릭하여 업로드
            </p>
            <p className="text-[12px] text-[#141414] mb-5">
              JPG · JPEG · PNG · PDF 최대 5MB (1개만 업로드 가능)
            </p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="px-6 py-2 bg-[#141414] text-white text-sm rounded-lg hover:opacity-90"
            >
              파일 선택
            </button>
          </div>

          {/* 업로드된 파일 목록 (하얀색 유지) */}
          <div className="w-64 flex-shrink-0 bg-[#FFFDFD] rounded-xl p-4 border border-[#E6E1E6]">
            <p className="text-[15px] text-[#141414] font-medium mb-3">
              업로드 자료
            </p>
            <div className="flex flex-col gap-2 max-h-[240px] overflow-y-auto">
              {files.map((f) => (
                <div
                  key={f.name}
                  className="flex items-center justify-between px-3 py-2 bg-[#F6F5FA] rounded-[7px] border border-[#E0DEDB]"
                >
                  <div className="flex items-center gap-[10px] min-w-0">
                    <span className="text-[12px] text-[#141414] truncate">
                      {f.name}
                    </span>
                    <span className="text-[12px] text-[#969696] flex-shrink-0">
                      {formatSize(f.size)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(f.name)}
                    className="text-[#969696] hover:text-black flex-shrink-0 text-base leading-none ml-2"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 용량 진행 바 */}
        <div className="mt-6">
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
            <div
              className="absolute left-0 top-0 h-full bg-[#623FB5] rounded-full transition-all"
              style={{ width: `${Math.min((totalMb / MAX_TOTAL_MB) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[12px] text-[#969696]">
            <span>0mb</span>
            <span>{formatSize(totalBytes)}</span>
            <span>{MAX_TOTAL_MB}mb</span>
          </div>
        </div>

        {/* 다음 버튼 */}
        <div className="flex justify-end mt-4">
          <button
            onClick={handleNext}
            disabled={uploading}
            className="px-8 py-2.5 bg-[#623FB5] text-white text-sm rounded-lg hover:opacity-90 disabled:opacity-60 transition"
          >
            {uploading ? "업로드 중..." : "다음"}
          </button>
        </div>
      </div>

      {/* 건너뛰기 */}
      <div className="flex justify-center mt-4">
        <button
          onClick={handleSkip}
          disabled={uploading}
          className="text-[12px] text-[#623FB5] hover:underline disabled:opacity-60"
        >
          {uploading ? (type === "prep" ? "준비 자료 생성 중..." : "안건 생성 중...") : "자료 업로드를 건너뛰시겠습니까?"}
        </button>
      </div>
    </div>
  );
}
