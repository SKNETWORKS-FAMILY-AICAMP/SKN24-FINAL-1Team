import {
  UPLOAD_PERIOD_OPTIONS,
  SORT_OPTIONS,
} from "../../constants/documentManagement";
import type { DocumentRecord } from "../../types/documentManagement";
import Table from "../ui/Table";
import type { TableColumn } from "../ui/Table";
import * as DESIGN from "../../constants/design";
import Button from "../ui/Button";
import Pagination from "../ui/Pagination";
import { DateRangePicker, FilterSelect } from "../ui/DatePickerBox";
import searchIcon from "../../assets/meeting/search.png";
import downloadIcon from "../../assets/document/download.png";

interface DocumentManagementPanelProps {
  allVisibleSelected: boolean;
  creatorFilter: string;
  creators: string[];
  documents: DocumentRecord[];
  query: string;
  selectedIds: Set<number>;
  uploadPeriod: string;
  startDate: string;
  endDate: string;
  sortOrder: string;
  currentPage: number;
  totalPages: number;
  onCreatorFilterChange: (creator: string) => void;
  onDeleteSelected: () => void;
  onDownloadSelected: () => void;
  onOpenUpload: () => void;
  onQueryChange: (query: string) => void;
  onPageChange: (page: number) => void;
  onToggleAllVisible: () => void;
  onToggleSelected: (documentId: number) => void;
  onUploadPeriodChange: (period: string) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onSortOrderChange: (order: string) => void;
  onDownloadDocument: (doc: DocumentRecord) => void;
}

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

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
  uploadPeriod,
  startDate,
  endDate,
  sortOrder,
  currentPage,
  totalPages,
  onCreatorFilterChange,
  onDeleteSelected,
  onDownloadSelected,
  onOpenUpload,
  onQueryChange,
  onPageChange,
  onToggleAllVisible,
  onToggleSelected,
  onUploadPeriodChange,
  onStartDateChange,
  onEndDateChange,
  onSortOrderChange,
  onDownloadDocument,
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
    {
      key: "download",
      header: "다운로드",
      width: "100px",
      align: "center",
      render: (row) => (
        <button
          type="button"
          aria-label={`${row.name} 다운로드`}
          onClick={(event) => {
            event.stopPropagation();
            onDownloadDocument(row);
          }}
          className="mx-auto flex items-center justify-center hover:opacity-70 active:scale-95 transition"
        >
          <img src={downloadIcon} alt="다운로드" className="w-5 h-5" />
        </button>
      ),
    },
  ];

  return (
    <section className="mx-auto w-full max-w-[1376px]" data-node-id="1:1397">
      <header>
        <h1 className="m-0 text-[32px] font-medium leading-[1.2] text-[#141414]">
          문서 관리
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
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <img src={searchIcon} alt="검색" className="w-5 h-5" />
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-[12px]">
            <Button onClick={onOpenUpload}>
              문서 등록 +
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {/* 업로더 */}
          <div className="flex items-center gap-2">
            <span className={`${DESIGN.FONT_SIZES.sm} text-[#141414] shrink-0`}>업로더</span>
            <FilterSelect
              ariaLabel="업로더 필터"
              value={creatorFilter}
              onChange={onCreatorFilterChange}
              options={creators}
            />
          </div>

          {/* 업로드 날짜 */}
          <div className="flex items-center gap-2">
            <span className={`${DESIGN.FONT_SIZES.sm} text-[#141414] shrink-0`}>업로드 날짜</span>
            <FilterSelect
              ariaLabel="업로드 기간 필터"
              value={uploadPeriod}
              onChange={onUploadPeriodChange}
              options={UPLOAD_PERIOD_OPTIONS}
            />
            <DateRangePicker
              startAriaLabel="업로드 시작일 선택"
              endAriaLabel="업로드 종료일 선택"
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={onStartDateChange}
              onEndDateChange={onEndDateChange}
            />
          </div>

          {/* 정렬 */}
          <div className="flex items-center gap-2">
            <span className={`${DESIGN.FONT_SIZES.sm} text-[#141414] shrink-0`}>정렬</span>
            <FilterSelect
              ariaLabel="정렬"
              value={sortOrder}
              onChange={onSortOrderChange}
              options={SORT_OPTIONS}
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button disabled={!hasSelection} onClick={onDownloadSelected}>
              <DownloadIcon className="size-[16px]" />
              다운로드
            </Button>
            <Button disabled={!hasSelection} onClick={onDeleteSelected} className="px-6">
              삭제
            </Button>
          </div>
        </div>

        <div className="mt-2 min-w-0">
          <Table data={documents} columns={columns} emptyMessage="조건에 맞는 문서가 없습니다." />
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        className="mt-[35px]"
      />
    </section>
  );
}
