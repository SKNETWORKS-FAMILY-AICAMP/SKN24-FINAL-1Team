import { useState, type CSSProperties } from "react";
import plusIcon from "../../assets/kanban/icon-plus.svg";
import {
  getKanbanColumnHeight,
  KANBAN_CARD_GAP,
  KANBAN_COLUMN_BODY_TOP,
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
        "absolute flex items-center gap-[8px] rounded-[5px] border-0 bg-transparent p-0 transition-all duration-150 ease-out hover:text-[#623FB5] hover:opacity-80 active:scale-[0.97]",
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
      className="absolute left-[23px] top-[10px] flex h-[142px] w-[306px] flex-col items-center justify-center gap-[12px] rounded-[10px] border border-dashed border-[#C4B6E5] bg-[#FFFDFD] p-0 text-center transition-all duration-150 ease-out hover:border-[#623FB5] hover:bg-[#F4F5F8] hover:shadow-[1px_1px_14px_4px_rgba(98,63,181,0.18)] active:scale-[0.985]"
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
}

export default function KanbanColumn({
  column,
  tasks,
  onAddTask,
  onEditTask,
  onCardDragStart,
  onCardDragEnd,
  onDropTask,
  draggingTaskId = null,
  isDragActive = false,
  canManage = true,
}: KanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);
  const hasTasks = tasks.length > 0;
  const columnHeight = getKanbanColumnHeight(tasks.length);
  const columnBackground = isOver ? "#E3DAFB" : hasTasks ? "#ECECF2" : "#EFECEF";
  const addButtonTop = KANBAN_FIRST_CARD_TOP + tasks.length * KANBAN_CARD_GAP;

  return (
    <section
      onDragOver={(event) => {
        if (!canManage || !isDragActive) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if (!isOver) setIsOver(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node)) return;
        setIsOver(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsOver(false);
        if (!canManage) return;
        onDropTask?.(column.id);
      }}
      className={`absolute overflow-hidden rounded-[12px] transition-all duration-200 ease-out ${
        isOver ? "outline outline-2 outline-dashed outline-[#623FB5]" : ""
      }`}
      style={{
        left: column.left,
        top: KANBAN_COLUMN_TOP,
        width: 352,
        height: columnHeight,
        backgroundColor: columnBackground,
      }}
      data-name="dashboard-card-group"
    >
      <h2 className="absolute left-[24px] top-[23px] m-0 whitespace-nowrap text-[17px] font-medium leading-[1.2] text-[#141414]">
        {column.label}
      </h2>
      <div
        className="absolute left-0 w-full overflow-visible"
        style={{ top: KANBAN_COLUMN_BODY_TOP }}
      >
        <div className="relative w-full">
          {hasTasks ? (
            <>
              {tasks.map((task, index) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  top={KANBAN_FIRST_CARD_TOP + index * KANBAN_CARD_GAP}
                  onClick={() => onEditTask(task)}
                  onDragStart={onCardDragStart}
                  onDragEnd={onCardDragEnd}
                  isDragging={draggingTaskId === task.id}
                  canManage={canManage}
                />
              ))}
              {canManage ? (
                <AddTaskButton
                  className="left-[23px]"
                  style={{ top: addButtonTop }}
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
