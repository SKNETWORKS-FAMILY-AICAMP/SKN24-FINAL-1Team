import type { ReactNode } from "react";
import type { MeetingJiraContent, MeetingJiraTask } from "../../types/meetingJira";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

interface MeetingJiraRegisterPanelProps {
  content: MeetingJiraContent;
  registering: boolean;
  selectedTaskIds: Set<number>;
  onRegister: () => void;
  onToggleTask: (taskId: number) => void;
}

function JiraTaskChip({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] items-center rounded-[11px] border bg-[#fffdfd] px-[8px] text-[12px] font-normal leading-[1.2]",
        active ? "border-[#6A1FEB] text-[#6A1FEB]" : "border-[#e6e1e6] text-[#141414]",
      )}
    >
      {children}
    </span>
  );
}

function SelectionIcon({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "flex size-[20px] items-center justify-center rounded-full border transition-colors",
        selected ? "border-[#6A1FEB] bg-[#6A1FEB] text-white" : "border-[#141414] bg-white text-[#141414]",
      )}
    >
      <svg aria-hidden="true" className="size-[13px]" fill="none" viewBox="0 0 24 24">
        <path
          d="m5 12 4 4L19 6"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        />
      </svg>
    </span>
  );
}

function JiraTaskRow({
  selected,
  task,
  onToggleTask,
}: {
  selected: boolean;
  task: MeetingJiraTask;
  onToggleTask: (taskId: number) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggleTask(task.id)}
      className={cn(
        "relative h-[75px] w-full rounded-[8px] border px-[13px] text-left transition-all duration-150 ease-out hover:border-[#6A1FEB] hover:bg-[#f4f1ff] active:scale-[0.995]",
        selected
          ? "border-[#6A1FEB] bg-[#dcd0fe]"
          : "border-[#e0dedb] bg-[#f8f7f5]",
      )}
    >
      <div className="flex h-full items-center justify-between gap-[24px]">
        <div className="min-w-0">
          <p className="m-0 truncate text-[15px] font-normal leading-[1.2] text-[#1a1a1a]">
            {task.title}
          </p>
          <div className="mt-[8px] flex flex-wrap gap-[8px]">
            <JiraTaskChip active={selected}>담당: {task.assignee}</JiraTaskChip>
            <JiraTaskChip active={selected}>기한: {task.dueDate}</JiraTaskChip>
            <JiraTaskChip active={selected}>{task.priority}</JiraTaskChip>
          </div>
        </div>
        <SelectionIcon selected={selected} />
      </div>
    </button>
  );
}

export default function MeetingJiraRegisterPanel({
  content,
  registering,
  selectedTaskIds,
  onRegister,
  onToggleTask,
}: MeetingJiraRegisterPanelProps) {
  const canRegister = selectedTaskIds.size > 0 && !registering;

  return (
    <section className="mx-auto w-full max-w-[992px]" data-node-id="117:6157">
      <header>
        <h1 className="m-0 text-[32px] font-normal leading-[1.2] text-[#1a1a1a]">
          {content.heading}
        </h1>
        <p className="mt-[6px] text-[16px] font-normal leading-[1.2] text-[#999]">
          {content.subheading}
        </p>
      </header>

      <div className="mt-[31px] h-[2px] w-full bg-[#e0dedb]" />

      <div className="mt-[20px] flex flex-col gap-[14px]">
        {content.tasks.map((task) => (
          <JiraTaskRow
            key={task.id}
            selected={selectedTaskIds.has(task.id)}
            task={task}
            onToggleTask={onToggleTask}
          />
        ))}
      </div>

      <section className="mt-[21px] flex h-[91px] items-center justify-between rounded-[12px] border border-[#e0dedb] bg-white px-[20px]">
        <p className="m-0 text-[15px] font-normal leading-[1.2] text-[#999]">
          {content.instruction}
        </p>
        <button
          type="button"
          disabled={!canRegister}
          onClick={onRegister}
          className={cn(
            "flex h-[48px] w-[150px] items-center justify-center rounded-[7px] border-0 text-[17px] font-medium leading-[1.2] transition-all duration-150 ease-out",
            canRegister
              ? "bg-[#6A1FEB] text-[#fffdfd] hover:bg-[#5635a8] active:scale-[0.98]"
              : "cursor-not-allowed bg-[#969696] text-[#fffdfd]",
          )}
        >
          {registering ? "등록 중" : "Jira 등록"}
        </button>
      </section>
    </section>
  );
}
