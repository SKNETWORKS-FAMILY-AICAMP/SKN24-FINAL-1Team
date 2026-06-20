import { type ComponentPropsWithoutRef } from "react";
import * as DESIGN from "../../constants/design";
import folder from "../../assets/project/folder.png"

interface Project {
  project_id: number;
  project_name: string;
  startDate: string;
  members: string[];
}

interface ProjectCardProps extends ComponentPropsWithoutRef<"div"> {
  project: Project;
  className?: string;
}

export default function ProjectCard({ 
    project, 
    className = "", ...props }: ProjectCardProps) {

return (
    <div
      {...props}
      className={`${DESIGN.BACKGROUND_COLORS.grayLight} ${DESIGN.PADDING_SIZES.xl} hover:shadow-md ${DESIGN.BORDER_COLORS.gray} hover:border-[#623FB5] ${DESIGN.RADIUS_SIZES.xl} flex flex-col w-[352px] ${className}`}
    >
      <img src={folder} alt="" className={`w-[20px] h-[20px] ${DESIGN.MARGIN_BOTTOM_SIZES.lg}`} />
      
      <p className={`${DESIGN.FONT_SIZES.lg}`}>
        {project.project_name}
      </p>
      <p className={`${DESIGN.FONT_SIZES.sm} ${DESIGN.MARGIN_BOTTOM_SIZES["4x1"]}`}>
        {project.startDate}
      </p>
      <p className={`${DESIGN.FONT_SIZES.sm} ${DESIGN.COLORS.black}`}> {/* 기본 텍스트는 어두운 색 */}
        {project.members && project.members.length > 4 ? (
          <>
            {project.members.slice(0, 4).join(', ')}
            <span className={DESIGN.COLORS.gray}>
              {` 외 ${project.members.length - 4}명`}
            </span>
          </>
        ) : (
          project.members?.join(', ')
        )}
      </p>
    </div>
  );
}
