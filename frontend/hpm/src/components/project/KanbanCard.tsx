import type { KanbanTask } from "../../types/kanban";

interface KanbanCardProps {
  task: KanbanTask;
  top: number;
  onClick: () => void;
  isDragging?: boolean;
  canManage?: boolean;
}

export default function KanbanCard({
  task,
  top,
  onClick,
  canManage = true,
}: KanbanCardProps) {
  return (
    <article
      className={`flex ml-[23px] w-[306px] mb-[18px] rounded-[10px] border-0 bg-[#FFFDFD] p-[14px] text-left transition-all duration-150 ease-out hover:bg-[#F4F5F8] hover:brightness-[0.96]
      focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#623FB5]`}
      select-none
      style={{ top }}
      data-name="dashboard=card"
    >
      <button
        type="button"
        onClick={canManage ? onClick : undefined}
        className={`rounded-[10px] border-0 bg-transparent p-0 text-left transition-all duration-150 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#623FB5] ${
          canManage ? "active:scale-[0.985]" : "cursor-default"
        }`}
      >
        <div className="flex flex-col">
          <div className="flex w-full flex-col items-start gap-[10px]">
            <p className="m-0 w-[270px] text-[15px] font-normal leading-[1.2] text-[#141414]">
              {task.title}
            </p>
            <span className="flex h-[22px] items-center justify-center rounded-[20px] bg-[#DCD0FE] px-[8px] py-px text-[11px] font-normal leading-[1.2] text-[#623FB5]">
              {task.category}
            </span>
            <p className="m-0 text-[12px] font-normal leading-[1.2] text-[#969696]">
              {task.dueDate}
            </p>
          </div>
          <div className="mt-[18px] flex w-full justify-between items-center">
            <p className=" text-[12px] font-normal text-[#141414]">
              {task.code}
            </p>
            {task.owner !== "-" && (
              <p className="text-right text-[12px] font-normal text-[#969696]">
                {task.owner}
              </p>
            )}
          </div>
        </div>
      </button>
    </article>
  );
}
