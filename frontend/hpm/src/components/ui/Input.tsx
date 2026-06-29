import { type ComponentPropsWithoutRef } from "react";
import * as DESIGN from "../../constants/design";

interface InputProps extends Omit<ComponentPropsWithoutRef<"input">, "size"> {
  label?: string;
  id: string;
  size?: keyof typeof DESIGN.FONT_SIZES;
  labelClassName?: string;
  inputClassName?: string;
  error?: string;
}

export default function Input({ 
    label, 
    id, 
    size = "md",
    labelClassName = "", 
    inputClassName = "",
    error,
    ...props 
    }: InputProps) {

  return (
    <div className={`flex flex-col w-full`}>
      {label && (
        <label htmlFor={id} className={`${DESIGN.FONT_SIZES[size]} ${labelClassName} ${DESIGN.MARGIN_BOTTOM_SIZES.md}`}>
          {label}
        </label>
      )}
     
      <input
        id={id}
        {...props}
        className={`w-full ${DESIGN.PADDING_SIZES.sm} ${DESIGN.RADIUS_SIZES.md} ${DESIGN.BORDER_COLORS.gray} ${DESIGN.FONT_SIZES[size]} focus:border-[#6A1FEB] focus:outline-none ${inputClassName} ${error ? DESIGN.BORDER_COLORS.purple : ""}`}
      />
      <div className="relative">
        {error && <p className={`${DESIGN.COLORS.purple} ${DESIGN.FONT_SIZES.md} ml-1 absolute ${DESIGN.MARGIN_TOP_SIZES.sm}`}>{error}</p>}
      </div>
    </div>
  );
}
