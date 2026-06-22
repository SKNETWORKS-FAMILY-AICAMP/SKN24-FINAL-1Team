import type { KanbanTask } from "../../types/kanban";

interface KanbanCardProps {
  task: KanbanTask;
  top: number;
  onClick: () => void;
  disabled?: boolean;
}

export default function KanbanCard({ task, top, onClick, disabled = false }: KanbanCardProps) {
  return (
    <article
      className={`absolute left-[23px] h-[142px] w-[306px] rounded-[10px] border-0 bg-[#FFFDFD] p-0 text-left transition-all duration-150 ease-out ${
        disabled
          ? ""
          : "hover:bg-[#F4F5F8] hover:brightness-[0.96] hover:shadow-[1px_1px_14px_4px_rgba(98,63,181,0.18)] active:scale-[0.985] active:bg-[#EFECEF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#623FB5]"
      }`}
      style={{ top }}
      data-name="dashboard=card"
    >
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`absolute inset-0 rounded-[10px] border-0 bg-transparent p-0 text-left transition-all duration-150 ease-out ${
          disabled
            ? "cursor-default"
            : "active:scale-[0.985] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#623FB5]"
        }`}
      >
        <div className="absolute left-[18px] top-[18px] flex w-[170px] flex-col items-start gap-[18px]">
          <div className="flex w-full flex-col items-start gap-[10px]">
            <p className="m-0 w-[170px] text-[15px] font-normal leading-[1.2] text-[#141414]">
              {task.title}
            </p>
            <span className="flex h-[22px] items-center justify-center rounded-[20px] bg-[#DCD0FE] px-[8px] py-px text-[11px] font-normal leading-[1.2] text-[#623FB5]">
              {task.category}
            </span>
            <p className="m-0 text-[12px] font-normal leading-[1.2] text-[#969696]">
              {task.dueDate}
            </p>
          </div>
          <p className="m-0 w-full text-[12px] font-normal leading-[1.2] text-[#141414]">
            {task.code}
          </p>
        </div>
      </button>
      <p className="pointer-events-none absolute left-[256px] top-[110px] m-0 w-[32px] text-center text-[12px] font-normal leading-[1.2] text-[#969696]">
        {task.owner}
      </p>
    </article>
  );
}
