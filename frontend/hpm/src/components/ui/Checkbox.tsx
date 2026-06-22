import { type ComponentPropsWithoutRef } from "react";

interface CheckboxProps extends ComponentPropsWithoutRef<"input"> {
  label?: string;
  checkboxClassName?: string;
}

export default function Checkbox({
  label,
  checkboxClassName = "",
  ...props
}: CheckboxProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer w-fit">
      <input
        type="checkbox"
        {...props}
        className={`w-4 h-4 rounded accent-[#623FB5] cursor-pointer ${checkboxClassName}`}
      />
      {label && (
        <span className="text-[15px] text-[#0A0A0A]">{label}</span>
      )}
    </label>
  );
}
