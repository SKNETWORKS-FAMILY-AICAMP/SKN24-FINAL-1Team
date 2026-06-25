import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type MouseEvent,
} from "react";
import * as DESIGN from "../../constants/design";
import moreIcon from "../../assets/kanban/more.png";
import folder from "../../assets/project/folder.png";

const VISIBLE_MEMBER_COUNT = 3;

interface Project {
  project_id: number;
  project_owner: number;
  project_name: string;
  startDate: string;
  members: string[];
}

interface ProjectCardProps extends ComponentPropsWithoutRef<"div"> {
  project: Project;
  className?: string;
  canDelete?: boolean;
  onDelete?: (project: Project) => void;
}

export default function ProjectCard({
  project,
  className = "",
  canDelete = false,
  onDelete,
  ...props
}: ProjectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const visibleMembers = project.members?.slice(0, VISIBLE_MEMBER_COUNT) ?? [];
  const remainingMemberCount = Math.max(
    (project.members?.length ?? 0) - VISIBLE_MEMBER_COUNT,
    0,
  );

  useEffect(() => {
    if (!menuOpen) return;

    const handleDocumentClick = (event: globalThis.MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => document.removeEventListener("mousedown", handleDocumentClick);
  }, [menuOpen]);

  const handleMenuClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setMenuOpen((current) => !current);
  };

  const handleDeleteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setMenuOpen(false);
    onDelete?.(project);
  };

  return (
    <div
      {...props}
      className={`${DESIGN.BACKGROUND_COLORS.grayLight} ${DESIGN.PADDING_SIZES.xl} hover:shadow-md ${DESIGN.BORDER_COLORS.gray} hover:border-[#623FB5] ${DESIGN.RADIUS_SIZES.xl} relative flex min-h-[224px] w-[352px] flex-col ${className}`}
    >
      {canDelete ? (
        <div ref={menuRef} className="absolute right-[24px] top-[24px] z-10">
          <button
            type="button"
            aria-label="프로젝트 메뉴"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={handleMenuClick}
            className="flex size-[28px] items-center justify-center rounded-full transition hover:bg-[#E6E1E6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#623FB5]"
          >
            <img alt="" aria-hidden="true" src={moreIcon} className="h-[16px] w-[3px] object-contain" />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-[34px] w-[126px] rounded-[14px] border border-[#F1EAF5] bg-white px-[10px] py-[8px] shadow-[0_6px_18px_rgba(20,20,20,0.12)]"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                role="menuitem"
                onClick={handleDeleteClick}
                className="h-[32px] w-full rounded-[8px] text-center text-[13px] font-medium text-[#FF2B2B] transition hover:bg-[#FFF1F1]"
              >
                프로젝트 삭제
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <img src={folder} alt="" className={`w-[20px] h-[20px] ${DESIGN.MARGIN_BOTTOM_SIZES.lg}`} />
      
      <p className={`${DESIGN.FONT_SIZES.h3} break-words`}>
        {project.project_name}
      </p>
      <p className={`${DESIGN.FONT_SIZES.lg} ${DESIGN.COLORS.gray} ${DESIGN.MARGIN_TOP_SIZES.xl}`}>
        {project.startDate}
      </p>
      <p className={`${DESIGN.FONT_SIZES.lg} ${DESIGN.COLORS.black} mt-auto break-words`}>
        {visibleMembers.length > 0 ? (
          <>
            {visibleMembers.join(", ")}
            {remainingMemberCount > 0 && (
              <span className={DESIGN.COLORS.gray}>
                {` 외 +${remainingMemberCount}`}
              </span>
            )}
          </>
        ) : (
          "참여자 없음"
        )}
      </p>
    </div>
  );
}
