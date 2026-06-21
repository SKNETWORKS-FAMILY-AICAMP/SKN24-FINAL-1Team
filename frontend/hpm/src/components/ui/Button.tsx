import React from "react";
import * as DESIGN from "../../constants/design";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  let variantClass = "";

  if (disabled) {
    variantClass = "bg-gray-300 text-white cursor-not-allowed";
  } else {
    switch (variant) {
      case "primary":
        variantClass = `${DESIGN.BACKGROUND_COLORS.purple} text-white hover:opacity-90 active:scale-[0.98]`;
        break;
      case "secondary":
        variantClass = "bg-gray-100 text-[#141414] hover:bg-gray-200 active:scale-[0.98]";
        break;
      case "danger":
        variantClass = "bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]";
        break;
      case "ghost":
        variantClass = "bg-transparent text-gray-600 hover:bg-gray-50 active:scale-[0.98]";
        break;
    }
  }

  let sizeClass = "";
  switch (size) {
    case "sm":
      sizeClass = "px-3 py-1.5 text-xs";
      break;
    case "md":
      sizeClass = `px-4 py-2 ${DESIGN.FONT_SIZES.sm}`;
      break;
    case "lg":
      sizeClass = `${DESIGN.PADDING_SIZES.sm} ${DESIGN.FONT_SIZES.md}`;
      break;
  }

  return (
    <button
      disabled={disabled}
      className={`inline-flex items-center justify-center text-center ${DESIGN.RADIUS_SIZES.sm} ${sizeClass} ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}