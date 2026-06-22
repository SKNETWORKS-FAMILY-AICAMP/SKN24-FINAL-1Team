import { useState, useRef, useEffect } from "react";

interface DropdownProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  dropdownClassName?: string;
}

export default function Dropdown({ options, value, onChange, dropdownClassName }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  return (
    <div ref={ref} className={`relative ${dropdownClassName ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2 border border-[#E5E5E5] rounded-md bg-white text-[15px] text-[#0A0A0A] hover:bg-[#F6F5FA] transition-colors"
      >
        <span>{value}</span>
        <svg
          className={`w-4 h-4 text-[#969696] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-[#E5E5E5] rounded-md shadow-md max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <li
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`px-3 py-2 text-[15px] cursor-pointer hover:bg-[#F6F5FA] transition-colors ${
                opt === value ? "text-[#623FB5] font-medium" : "text-[#0A0A0A]"
              }`}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
