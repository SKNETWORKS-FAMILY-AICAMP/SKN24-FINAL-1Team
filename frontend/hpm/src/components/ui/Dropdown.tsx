import { useState, useRef, useEffect } from "react";

interface DropdownProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  dropdownClassName?: string;
}

export default function Dropdown({
  options,
  value,
  onChange,
  placeholder = "전체",
  dropdownClassName = "",
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div ref={ref} className={`relative ${dropdownClassName}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center justify-between w-full px-4 py-3 rounded-md border border-[#E5E5E5] text-[15px] bg-white hover:border-[#6A1FEB] transition-colors"
      >
        <span className={value ? "text-[#0A0A0A]" : "text-[#969696]"}>
          {value || placeholder}
        </span>
        <svg
          className={`w-4 h-4 ml-2 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"

        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <ul className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-md border border-[#E5E5E5] max-h-[200px] overflow-y-auto">
          {options.map((option) => (
            <li
              key={option}
              onClick={() => handleSelect(option)}
              className={`px-4 py-3 cursor-pointer text-[15px] text-[#0A0A0A] transition-colors
                ${value === option ? "bg-[#F6F5FA]" : "hover:bg-[#F6F5FA]"}`}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
