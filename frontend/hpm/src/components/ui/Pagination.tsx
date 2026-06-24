interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  maxVisiblePages?: number;
}

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("size-[14px]", direction === "left" && "rotate-180")}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m9 5 7 7-7 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function getVisiblePages(currentPage: number, totalPages: number, maxVisiblePages: number) {
  const safeTotal = Math.max(0, totalPages);
  const windowSize = Math.max(1, maxVisiblePages);

  if (safeTotal <= windowSize) {
    return Array.from({ length: safeTotal }, (_, index) => index + 1);
  }

  const halfWindow = Math.floor(windowSize / 2);
  let start = Math.max(1, currentPage - halfWindow);
  let end = start + windowSize - 1;

  if (end > safeTotal) {
    end = safeTotal;
    start = end - windowSize + 1;
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
  maxVisiblePages = 5,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const visiblePages = getVisiblePages(safeCurrentPage, totalPages, maxVisiblePages);
  const isFirstPage = safeCurrentPage === 1;
  const isLastPage = safeCurrentPage === totalPages;

  const changePage = (page: number) => {
    if (page < 1 || page > totalPages || page === safeCurrentPage) return;
    onPageChange(page);
  };

  return (
    <nav
      aria-label="페이지"
      className={`flex items-center justify-center gap-[14px] text-[15px] text-[#969696] ${className}`}
    >
      <button
        type="button"
        aria-label="이전 페이지"
        disabled={isFirstPage}
        onClick={() => changePage(safeCurrentPage - 1)}
        className={cn(
          "flex size-[24px] items-center justify-center rounded-[4px] border-0 bg-transparent p-0 transition-colors",
          isFirstPage
            ? "cursor-not-allowed text-[#d8d8dc]"
            : "hover:bg-[#f0edf6] hover:text-[#141414]",
        )}
      >
        <ChevronIcon direction="left" />
      </button>

      {visiblePages.map((page) => {
        const isActive = page === safeCurrentPage;

        return (
          <button
            key={page}
            type="button"
            aria-current={isActive ? "page" : undefined}
            onClick={() => changePage(page)}
            className={cn(
              "flex size-[24px] items-center justify-center rounded-[4px] border-0 bg-transparent p-0 transition-colors hover:bg-[#f0edf6]",
              isActive
                ? "text-[#141414]"
                : "text-[#969696] hover:text-[#141414]",
            )}
          >
            {page}
          </button>
        );
      })}

      <button
        type="button"
        aria-label="다음 페이지"
        disabled={isLastPage}
        onClick={() => changePage(safeCurrentPage + 1)}
        className={cn(
          "flex size-[24px] items-center justify-center rounded-[4px] border-0 bg-transparent p-0 transition-colors",
          isLastPage
            ? "cursor-not-allowed text-[#d8d8dc]"
            : "hover:bg-[#f0edf6] hover:text-[#141414]",
        )}
      >
        <ChevronIcon direction="right" />
      </button>
    </nav>
  );
}
