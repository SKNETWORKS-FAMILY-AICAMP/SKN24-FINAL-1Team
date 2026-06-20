import {
  ALL_DOCUMENT_FILTER,
  DOCUMENT_UPLOAD_DATE_LABEL,
  EMPTY_UPLOAD_DATE_FILTER,
} from "../../constants/documentManagement";
import type { DocumentRecord } from "../../types/documentManagement";
import Table from "../ui/Table";
import type { TableColumn } from "../ui/Table";
import * as DESIGN from "../../constants/design";
import Button from "../ui/Button";

interface DocumentManagementPanelProps {
  allVisibleSelected: boolean;
  creatorFilter: string;
  creators: string[];
  documents: DocumentRecord[];
  query: string;
  selectedIds: Set<number>;
  uploadDateFilter: string;
  uploadDates: string[];
  onCreatorFilterChange: (creator: string) => void;
  onDeleteSelected: () => void;
  onDownloadDocument: (document: DocumentRecord) => void;
  onDownloadSelected: () => void;
  onOpenUpload: () => void;
  onQueryChange: (query: string) => void;
  onToggleAllVisible: () => void;
  onToggleSelected: (documentId: number) => void;
  onUploadDateFilterChange: (date: string) => void;
}

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-[22px] shrink-0"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m20 20-4.1-4.1m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
        stroke="#141414"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DownloadIcon({ className = "size-[20px]" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 4v10m0 0 4-4m-4 4-4-4M5 19h14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

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

function DropdownChevronIcon() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute right-[14px] top-1/2 size-[14px] -translate-y-1/2 text-[#141414]"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function DocumentCheckButton({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={checked}
      onClick={onClick}
      className={cn(
        "mx-auto flex size-[18px] items-center justify-center rounded-[4px] border transition-all duration-150 active:scale-95",
        checked
          ? "border-[#623fb5] bg-[#623fb5]"
          : "border-[#8c8794] bg-[#fffdfd] hover:border-[#623fb5]",
      )}
    >
      {checked ? (
        <svg aria-hidden="true" className="size-[12px]" fill="none" viewBox="0 0 16 16">
          <path
            d="m3.5 8.1 2.8 2.8 6.2-6.4"
            stroke="#fffdfd"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          />
        </svg>
      ) : null}
    </button>
  );
}

export default function DocumentManagementPanel({
  allVisibleSelected,
  creatorFilter,
  creators,
  documents,
  query,
  selectedIds,
  uploadDateFilter,
  uploadDates,
  onCreatorFilterChange,
  onDeleteSelected,
  onDownloadDocument,
  onDownloadSelected,
  onOpenUpload,
  onQueryChange,
  onToggleAllVisible,
  onToggleSelected,
  onUploadDateFilterChange,
}: DocumentManagementPanelProps) {
  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;

  const columns: TableColumn<DocumentRecord>[] = [
    {
      key: "select",
      header: (
        <DocumentCheckButton
          checked={allVisibleSelected}
          label="현재 목록 전체 선택"
          onClick={onToggleAllVisible}
        />
      ),
      width: "60px",
      align: "center",
      render: (row) => (
        <DocumentCheckButton
          checked={selectedIds.has(row.id)}
          label={`${row.name} 선택`}
          onClick={() => onToggleSelected(row.id)}
        />
      ),
    },
    {
      key: "name",
      header: "문서명",
      align: "left",
      render: (row) => <span className="truncate px-[8px]">{row.name}</span>,
    },
    {
      key: "creator",
      header: "생성자",
      width: "150px",
      align: "center",
      render: (row) => <span className="truncate px-[8px]">{row.creator}</span>,
    },
    {
      key: "department",
      header: "부서",
      width: "135px",
      align: "center",
      render: (row) => <span className="truncate px-[8px]">{row.department}</span>,
    },
    {
      key: "uploadedAt",
      header: "업로드 날짜",
      width: "200px",
      align: "center",
      render: (row) => <span>{row.uploadedAt}</span>,
    },
  ];

  return (
    <section className="mx-auto w-full max-w-[1376px]" data-node-id="1:1397">
      <header>
        <h1 className="m-0 text-[32px] font-medium leading-[1.2] text-[#141414]">
          내부 문서 관리
        </h1>
        <p className="mt-[12px] text-[15px] font-normal leading-[1.2] text-[#969696]">
          사내 문서를 등록하고 관리할 수 있습니다.
        </p>
      </header>

        <div className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-[16px] xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="문서명, 파일명, 작성자로 검색하세요"
              className={`w-full ${DESIGN.BACKGROUND_COLORS.white} ${DESIGN.BORDER_COLORS.gray} ${DESIGN.RADIUS_SIZES.md} ${DESIGN.FONT_SIZES.sm} pl-4 pr-10 py-2.5 outline-none focus:border-[#623FB5] focus:ring-1 focus:ring-[#623FB5]/10 transition`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-[12px]">
            <Button onClick={onOpenUpload}>
              문서 등록 +
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-[16px] xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="생성자 필터"
              value={creatorFilter}
              onChange={(event) => onCreatorFilterChange(event.target.value)}
              className={`py-2 px-3 bg-white ${DESIGN.BORDER_COLORS.gray} ${DESIGN.RADIUS_SIZES.sm} ${DESIGN.FONT_SIZES.sm} outline-none cursor-pointer focus:border-[#623FB5]`}
            >
              {creators.map((creator) => (
                <option key={creator} value={creator}>
                  {creator === ALL_DOCUMENT_FILTER ? "생성자" : creator}
                </option>
              ))}
            </select>

            <select
              aria-label="업로드 날짜 필터"
              value={uploadDateFilter}
              onChange={(event) => onUploadDateFilterChange(event.target.value)}
              className={`py-2 px-3 bg-white ${DESIGN.BORDER_COLORS.gray} ${DESIGN.RADIUS_SIZES.sm} ${DESIGN.FONT_SIZES.sm} outline-none cursor-pointer focus:border-[#623FB5]`}
            >
              <option value={EMPTY_UPLOAD_DATE_FILTER}>{DOCUMENT_UPLOAD_DATE_LABEL}</option>
              {uploadDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={!hasSelection}
              onClick={onDownloadSelected}
            >
              <DownloadIcon className="size-[16px]" />
              다운로드
            </Button>
            <Button
              disabled={!hasSelection}
              onClick={onDeleteSelected}
              className="px-6"
            >
              삭제
            </Button>
          </div>
        </div>

        <div className="mt-2 min-w-0">
          <Table data={documents} columns={columns} emptyMessage="조건에 맞는 문서가 없습니다." />
        </div>
      </div>

      <nav
        aria-label="문서 목록 페이지"
        className="mt-[35px] flex items-center justify-center gap-[14px] text-[15px] text-[#969696]"
      >
        <button
          type="button"
          aria-label="이전 페이지"
          className="flex size-[24px] items-center justify-center rounded-[4px] border-0 bg-transparent p-0 transition-colors hover:bg-[#f0edf6] hover:text-[#141414]"
        >
          <ChevronIcon direction="left" />
        </button>
        {[1, 2, 3, 4, 5].map((page) => (
          <button
            key={page}
            type="button"
            className={cn(
              "flex size-[24px] items-center justify-center rounded-[4px] border-0 bg-transparent p-0 transition-colors hover:bg-[#f0edf6]",
              page === 1 ? "text-[#141414]" : "text-[#969696]",
            )}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          aria-label="다음 페이지"
          className="flex size-[24px] items-center justify-center rounded-[4px] border-0 bg-transparent p-0 transition-colors hover:bg-[#f0edf6] hover:text-[#141414]"
        >
          <ChevronIcon direction="right" />
        </button>
      </nav>
    </section>
  );
}
