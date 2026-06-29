import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../constants/auth';

export default function GlobalLoginModal() {
  const { isLoginModalOpen, closeLoginModal } = useAuthStore();
  const navigate = useNavigate();

  if (!isLoginModalOpen) return null;

  const handleConfirm = () => {
    closeLoginModal();
    navigate('/login');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#969696]">
      <div className="bg-white rounded-2xl w-80 overflow-hidden shadow-xl">
        <div className="px-8 py-10 text-center">
          <p className="text-[#6A1FEB] text-[14px] leading-relaxed">로그인이 필요한 서비스입니다.</p>
        </div>
        <div className="border-t border-gray-200">
          <button
            onClick={handleConfirm}
            className="w-full py-4 text-sm text-gray-700 hover:bg-gray-50 transition font-medium"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
