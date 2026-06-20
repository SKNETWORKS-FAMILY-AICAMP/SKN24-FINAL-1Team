import React from "react";
import * as DESIGN from "../../constants/design";

interface PaginationProps {
  /**
   * 현재 선택된 페이지 번호 (1부터 시작)
   */
  currentPage: number;
  /**
   * 전체 페이지 수
   */
  totalPages: number;
  /**
   * 페이지 번호 클릭 이벤트 헨들러
   */
  onPageChange: (page: number) => void;
  /**
   * 추가적인 스타일링을 위한 클래스네임
   */
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-center gap-4 ${className}`}>
      {/* 이전 페이지 버튼 */}
      <button
        onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`text-lg font-bold transition-colors ${
          currentPage === 1
            ? "text-gray-300 cursor-not-allowed"
            : `${DESIGN.COLORS.gray} hover:text-black`
        }`}
        aria-label="이전 페이지"
      >
        &lt;
      </button>

      {/* 페이지 번호 버튼 배열 */}
      {Array.from({ length: totalPages }).map((_, idx) => {
        const pageNum = idx + 1;
        const isActive = currentPage === pageNum;

        return (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 ${
              DESIGN.FONT_SIZES.sm
            } ${
              isActive
                ? `${DESIGN.BACKGROUND_COLORS.purple} ${DESIGN.COLORS.white} font-bold`
                : `${DESIGN.COLORS.gray} ${DESIGN.BACKGROUND_COLORS.grayLightHover}`
            }`}
          >
            {pageNum}
          </button>
        );
      })}

      {/* 다음 페이지 버튼 */}
      <button
        onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`text-lg font-bold transition-colors ${
          currentPage === totalPages
            ? "text-gray-300 cursor-not-allowed"
            : `${DESIGN.COLORS.gray} hover:text-black`
        }`}
        aria-label="다음 페이지"
      >
        &gt;
      </button>
    </div>
  );
}
