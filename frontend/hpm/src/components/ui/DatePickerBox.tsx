import { useRef } from "react";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

interface DatePickerBoxProps {
  ariaLabel?: string;
  className?: string;
  onChange: (value: string) => void;
  value: string;
}

type FilterOption = string | { label: string; value: string };

interface FilterSelectProps {
  ariaLabel?: string;
  className?: string;
  onChange: (value: string) => void;
  options: readonly FilterOption[];
  value: string;
}

interface DateRangePickerProps {
  className?: string;
  endAriaLabel?: string;
  endDate: string;
  onEndDateChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  startAriaLabel?: string;
  startDate: string;
}

function CalendarIcon() {
  return (
    <svg aria-hidden="true" className="size-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DatePickerBox({
  ariaLabel = "날짜 선택",
  className,
  onChange,
  value,
}: DatePickerBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const input = inputRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
    if (!input) return;

    input.focus();
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        // Some browsers expose showPicker but restrict when it can be called.
      }
    }
    input.click();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPicker();
        }
      }}
      className={cn(
        "relative flex w-[100px] cursor-pointer items-center justify-between overflow-hidden rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-[#141414] transition hover:border-[#6A1FEB] focus:border-[#6A1FEB] focus:outline-none",
        className,
      )}
    >
      {value && <span className="flex-1 truncate">{value}</span>}
      <span className="ml-auto pointer-events-none">
        <CalendarIcon />
      </span>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
        tabIndex={-1}
      />
    </div>
  );
}

export function FilterSelect({
  ariaLabel = "필터 선택",
  className,
  onChange,
  options,
  value,
}: FilterSelectProps) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "w-[100px] cursor-pointer appearance-none rounded-md border border-gray-300 bg-white px-3 py-2 text-[12px] text-[#141414] outline-none transition focus:border-[#6A1FEB]",
        className,
      )}
    >
      {options.map((option) => {
        const optionValue = typeof option === "string" ? option : option.value;
        const optionLabel = typeof option === "string" ? option : option.label;
        return (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        );
      })}
    </select>
  );
}

export function DateRangePicker({
  className,
  endAriaLabel = "종료일 선택",
  endDate,
  onEndDateChange,
  onStartDateChange,
  startAriaLabel = "시작일 선택",
  startDate,
}: DateRangePickerProps) {
  return (
    <div className={cn("flex items-center gap-2 transition-all duration-200", className)}>
      <DatePickerBox ariaLabel={startAriaLabel} value={startDate} onChange={onStartDateChange} />
      <span className="text-[12px] text-gray-400">-</span>
      <DatePickerBox ariaLabel={endAriaLabel} value={endDate} onChange={onEndDateChange} />
    </div>
  );
}
