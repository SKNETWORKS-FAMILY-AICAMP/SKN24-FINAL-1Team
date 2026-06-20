import { type ComponentPropsWithoutRef } from "react";
import * as DESIGN from "../../constants/design";
import plus from "../../assets/project/plus.png"

interface ProjectAddProps extends ComponentPropsWithoutRef<"div"> {
  className?: string;
}

export default function ProjectAdd({ className = "", ...props }: ProjectAddProps) {
  return (
    <div
      {...props}
      className={`${DESIGN.BACKGROUND_COLORS.white} ${DESIGN.RADIUS_SIZES.xl} cursor-pointer hover:shadow-md hover:border-[#623FB5] transition border-dashed ${DESIGN.BORDER_COLORS.gray} flex items-center justify-center w-[352px] min-h-[160px] ${className}`}
    >
        <div className="flex flex-col items-center justify-center">
            <img className={`w-[20px] h-[20px] ${DESIGN.MARGIN_BOTTOM_SIZES.xl}`} src={plus} alt="" />
            <p>프로젝트 생성</p>
        </div>
    </div>
  );
}
