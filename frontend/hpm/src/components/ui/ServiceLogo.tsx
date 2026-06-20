import { type ComponentPropsWithoutRef } from "react";
import * as DESIGN from "../../constants/design";
import logo from "../../assets/login/logo.png"

interface ProjectAddProps extends ComponentPropsWithoutRef<"div"> {
  className?: string;
}

export default function ProjectAdd({ className = "", ...props }: ProjectAddProps) {
  return (
    <div
      {...props}
      className=""
    >
      <div className={`flex justify-center items-center ${DESIGN.GAP_SIZES.xl}`}><img src={logo} alt="" /><p className={DESIGN.FONT_SIZES.h2}>회의피하지마</p></div>
    </div>
  );
}
