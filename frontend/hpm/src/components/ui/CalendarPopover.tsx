import { getCalendarCells, shiftCalendarMonth } from "../../constants/calendar";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

interface CalendarPopoverProps {
  className?: string;
  displayMonth: { year: number; month: number };
  onMonthChange: (value: { year: number; month: number }) => void;
  onSelectDate: (value: string) => void;
  selectedDate: string;
}

export default function CalendarPopover({
  className,
  displayMonth,
  onMonthChange,
  onSelectDate,
  selectedDate,
}: CalendarPopoverProps) {
  const cells = getCalendarCells(displayMonth.year, displayMonth.month);

  return (
    <section
      className={cn(
        "z-50 h-[311px] w-[325px] overflow-hidden rounded-[10.849px] border border-[#E6E1E6] bg-white shadow-[1px_1px_14px_4px_rgba(230,228,228,0.25)]",
        className,
      )}
      data-node-id="1:9848"
      data-name="Calendar UI Light"
    >
      <div className="flex h-[54px] w-full items-center justify-between px-[25px] text-[#141414]">
        <button
          type="button"
          aria-label="이전 달"
          onClick={() =>
            onMonthChange(shiftCalendarMonth(displayMonth.year, displayMonth.month, -1))
          }
          className="flex size-[24px] items-center justify-center rounded-full border-0 bg-transparent p-0 text-[18px] leading-none text-[#141414] transition-all duration-150 ease-out hover:bg-[#F4F5F8] hover:text-[#623FB5] active:scale-[0.92]"
        >
          ‹
        </button>
        <p className="m-0 text-center text-[15.5px] font-medium leading-[1.2]">
          {displayMonth.year}년 {displayMonth.month}월
        </p>
        <button
          type="button"
          aria-label="다음 달"
          onClick={() =>
            onMonthChange(shiftCalendarMonth(displayMonth.year, displayMonth.month, 1))
          }
          className="flex size-[24px] items-center justify-center rounded-full border-0 bg-transparent p-0 text-[18px] leading-none text-[#141414] transition-all duration-150 ease-out hover:bg-[#F4F5F8] hover:text-[#623FB5] active:scale-[0.92]"
        >
          ›
        </button>
      </div>
      <div className="h-px w-full bg-[#E6E1E6]" />
      <div className="grid grid-cols-7 gap-x-[7.75px] px-[24.8px] py-[6px]">
        {["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((day) => (
          <span
            key={day}
            className="flex h-[16px] items-center justify-center text-[9.3px] font-medium uppercase leading-[1] tracking-[0.28px] text-[#141414]"
          >
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-x-[7.75px] gap-y-[2px] px-[24.8px]">
        {cells.map((cell, index) => {
          const selected = cell.value === selectedDate;

          return (
            <button
              key={`${cell.value}-${index}`}
              type="button"
              onClick={() => onSelectDate(cell.value)}
              className={cn(
                "flex size-[32.55px] items-center justify-center rounded-full border-0 bg-transparent p-0 text-[13.95px] font-medium leading-[17px] transition-all duration-150 ease-out active:scale-[0.92]",
                selected
                  ? "bg-[#623FB5] text-[#FFFDFD] hover:bg-[#56379F]"
                  : cell.muted
                    ? "text-[#969696] hover:bg-[#F4F5F8] hover:text-[#623FB5]"
                    : "text-[#141414] hover:bg-[#F4F5F8] hover:text-[#623FB5]",
              )}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </section>
  );
}
