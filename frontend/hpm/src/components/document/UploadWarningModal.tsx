import warningIcon from "../../assets/meeting/warning.png";

interface UploadWarningModalProps {
  message: string;
  onClose: () => void;
}

export default function UploadWarningModal({ message, onClose }: UploadWarningModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl w-80 overflow-hidden shadow-xl">
        <div className="px-8 pt-10 pb-6 flex flex-col items-center text-center">
          <img src={warningIcon} alt="경고" className="w-14 h-14 mb-5" />
          <p className="text-[#6A1FEB] text-[14px] leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>
        <div className="border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full py-4 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
