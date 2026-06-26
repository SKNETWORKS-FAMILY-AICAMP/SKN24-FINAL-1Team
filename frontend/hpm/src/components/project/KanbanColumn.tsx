import { type CSSProperties } from "react";
import plusIcon from "../../assets/kanban/plus.png";
import {
  KANBAN_CARD_GAP,
  KANBAN_COLUMN_TOP,
  KANBAN_FIRST_CARD_TOP,
} from "../../constants/kanban";
import type { KanbanColumnConfig, KanbanColumnId, KanbanTask } from "../../types/kanban";
import KanbanCard from "./KanbanCard";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

interface AddTaskButtonProps {
  className: string;
  onClick: () => void;
  style?: CSSProperties;
}

function AddTaskButton({ className, onClick, style }: AddTaskButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        "mt-[23px] ml-[23px] flex items-center gap-[8px] rounded-[5px] border-0 bg-transparent p-0 transition-all duration-150 ease-out hover:text-[#623FB5] hover:opacity-80 active:scale-[0.97]",
        className,
      )}
    >
      <img alt="" aria-hidden="true" className="size-[12px] object-contain" src={plusIcon} />
      <span className="text-[15px] font-normal leading-[1.2] text-[#141414]">
        추가 하기
      </span>
    </button>
  );
}

interface EmptyAddCardProps {
  onClick: () => void;
}

function EmptyAddCard({ onClick }: EmptyAddCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className=" flex ml-[23px] h-[142px] w-[306px] flex-col items-center justify-center gap-[12px] rounded-[10px] border border-dashed border-[#C4B6E5] bg-[#FFFDFD] p-0 text-center transition-all duration-150 ease-out hover:border-[#623FB5] hover:bg-[#F4F5F8] hover:shadow-[1px_1px_14px_4px_rgba(98,63,181,0.18)] active:scale-[0.985]"
    >
      <img alt="" aria-hidden="true" className="size-[14px] object-contain" src={plusIcon} />
      <span className="text-[15px] font-normal leading-[1.2] text-[#141414]">
        추가 하기
      </span>
    </button>
  );
}

interface KanbanColumnProps {
  column: KanbanColumnConfig;
  tasks: KanbanTask[];
  onAddTask: (columnId: KanbanColumnId) => void;
  onEditTask: (task: KanbanTask) => void;
  onCardDragStart?: (task: KanbanTask) => void;
  onCardDragEnd?: () => void;
  onDropTask?: (columnId: KanbanColumnId) => void;
  draggingTaskId?: number | null;
  isDragActive?: boolean;
  canManage?: boolean;
  minHeight?: number;
}

export default function KanbanColumn({
  column,
  tasks,
  onAddTask,
  onEditTask,
  canManage = true,
}: KanbanColumnProps) {

  const hasTasks = tasks.length > 0;

  return (
    <section
      className={`absolute rounded-[12px] mt-[-20px] transition-all`}
      style={{
        left: column.left,
        top: KANBAN_COLUMN_TOP,
        width: 352,
        height: "auto",
        backgroundColor: "#ECECF2",
      }}
      data-name="dashboard-card-group"
    >
      <h2 className=" m-[26px] mb-[18px] text-[17px] font-medium leading-[1.2] text-[#141414]">
        {column.label}
      </h2>
      <div
        className="flex flex-col pb-[28px]"
      >
        <div className="w-full">
          {hasTasks ? (
            <>
              {tasks.map((task, index) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  top={KANBAN_FIRST_CARD_TOP + index * KANBAN_CARD_GAP}
                  onClick={() => onEditTask(task)}
                  canManage={canManage}
                />
              ))}
              {canManage ? (
                <AddTaskButton
                  className="left-[23px]"
                  onClick={() => onAddTask(column.id)}
                />
              ) : null}
            </>
          ) : (
            canManage ? <EmptyAddCard onClick={() => onAddTask(column.id)} /> : null
          )}
        </div>
      </div>
    </section>
  );
}
