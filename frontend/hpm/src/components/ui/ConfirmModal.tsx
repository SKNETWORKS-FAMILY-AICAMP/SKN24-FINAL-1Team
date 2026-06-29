import type { ReactNode } from "react";

interface ConfirmModalProps {
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  message,
  confirmText = "확인",
  cancelText = "취소",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30">
      <div className="w-80 overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="px-8 py-10 text-center">
          <p className="whitespace-pre-line text-[14px] font-medium leading-relaxed text-[#6A1FEB]">
            {message}
          </p>
        </div>
        <div className="flex border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 border-r border-gray-200 py-4 text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "처리 중..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
