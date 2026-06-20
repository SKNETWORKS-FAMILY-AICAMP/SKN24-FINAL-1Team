const padDatePart = (value: number) => String(value).padStart(2, "0");

export const parseCalendarDate = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);

  return {
    year: Number.isFinite(year) ? year : 2026,
    month: Number.isFinite(month) ? month : 6,
    day: Number.isFinite(day) ? day : 15,
  };
};

const formatCalendarDate = (year: number, month: number, day: number) =>
  `${year}-${padDatePart(month)}-${padDatePart(day)}`;

export const getCalendarCells = (year: number, month: number) => {
  const firstDay = new Date(year, month - 1, 1).getDay();

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month - 1, 1 - firstDay + index);
    const cellYear = date.getFullYear();
    const cellMonth = date.getMonth() + 1;
    const cellDay = date.getDate();

    return {
      day: cellDay,
      muted: cellMonth !== month,
      value: formatCalendarDate(cellYear, cellMonth, cellDay),
    };
  });
};

export const shiftCalendarMonth = (year: number, month: number, amount: number) => {
  const nextDate = new Date(year, month - 1 + amount, 1);

  return {
    year: nextDate.getFullYear(),
    month: nextDate.getMonth() + 1,
  };
};
