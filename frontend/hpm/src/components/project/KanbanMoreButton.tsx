import moreIcon from "../../assets/kanban/icon-more-vertical.svg";

interface KanbanMoreButtonProps {
  label: string;
  onClick?: () => void;
  className?: string;
}

export default function KanbanMoreButton({
  label,
  onClick,
  className = "",
}: KanbanMoreButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`flex size-[24px] items-center justify-center rounded-full border-0 bg-transparent p-0 transition-all duration-150 ease-out hover:bg-[#E6E1E6] active:scale-[0.92] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#623FB5] ${className}`}
    >
      <img alt="" aria-hidden="true" className="h-[14px] w-[2px] object-contain" src={moreIcon} />
    </button>
  );
}
