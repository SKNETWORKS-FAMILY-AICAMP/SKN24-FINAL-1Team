import { type ChangeEvent } from "react";
import closeIcon from "../../assets/kanban/close.png";
import { KANBAN_PRIORITIES } from "../../constants/kanban";
import type {
  KanbanModalState,
  KanbanPriority,
  KanbanTaskFormValues,
} from "../../types/kanban";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function PriorityChip({
  priority,
  selected,
  onClick,
}: {
  priority: KanbanPriority;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-[22px] rounded-[20px] border px-[8px] py-[2px] text-[12px] font-normal leading-[1.2] transition-all duration-150 ease-out active:scale-[0.96]",
        selected
          ? "border-[#623FB5] bg-[#DCD0FE] text-[#141414] hover:bg-[#C4B6E5]"
          : "border-[#969696] bg-[#FFFDFD] text-[#969696] hover:border-[#623FB5] hover:bg-[#F4F1FF] hover:text-[#623FB5]",
      )}
    >
      {priority}
    </button>
  );
}

function OptionChip({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-[22px] max-w-[170px] truncate rounded-[20px] border px-[8px] py-px text-[11px] font-normal leading-[1.2] transition-all duration-150 ease-out active:scale-[0.96]",
        selected
          ? "border-[#623FB5] bg-[#DCD0FE] text-[#141414] hover:bg-[#C4B6E5]"
          : "border-[#969696] bg-[#F4F5F8] text-[#969696] hover:border-[#623FB5] hover:bg-[#ECECF2] hover:text-[#623FB5]",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {label}
    </button>
  );
}

interface KanbanSelectOption {
  value: string;
  label: string;
}

interface KanbanTaskModalProps {
  modal: KanbanModalState;
  onCancel: () => void;
  onChange: (values: KanbanTaskFormValues) => void;
  onSubmit: () => void | Promise<void>;
  assigneeOptions: KanbanSelectOption[];
  parentOptions: KanbanSelectOption[];
}

export default function KanbanTaskModal({
  modal,
  onCancel,
  onChange,
  onSubmit,
  assigneeOptions,
  parentOptions,
}: KanbanTaskModalProps) {
  const { values } = modal;
  const canSubmit = Boolean(values.title.trim()) && Boolean(values.priority);
  const isEdit = modal.mode === "edit";

  const update = <Key extends keyof KanbanTaskFormValues>(
    key: Key,
    value: KanbanTaskFormValues[Key],
  ) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <>
      <div
        className="fixed left-[256px] top-0 z-30 h-screen w-[calc(100vw-256px)] bg-[rgba(113,110,110,0.7)]"
        data-name="modal-backdrop"
      />
      <section
        className="fixed left-[791px] top-[200px] z-40 h-[663px] w-[480px] overflow-visible rounded-[10px] bg-[#FFFDFD]"
        data-node-id={isEdit ? "1:7006" : "1:6961"}
        data-name="업무 수동 추가"
      >
        <h2 className="absolute left-1/2 top-[33px] m-0 w-[307px] -translate-x-1/2 text-center text-[24px] font-medium leading-[1.2] text-[#1A1A1A]">
          {isEdit ? "업무 관리" : "업무 추가"}
        </h2>
        <p className="absolute left-[307px] top-[76px] m-0 w-[143px] text-[12px] font-normal leading-[1.2] text-[#1A1A1A]">
          <span className="text-[#E52E2E]">*</span>표시는 필수 입력사항 입니다
        </p>
        <button
          type="button"
          aria-label="닫기"
          onClick={onCancel}
          className="absolute left-[431px] top-[22px] flex size-[24px] items-center justify-center rounded-full border-0 bg-transparent p-0 text-[#141414] transition-all duration-150 ease-out hover:bg-[#F4F5F8] active:scale-[0.92]"
        >
          <img alt="" aria-hidden="true" className="size-[24px] object-contain" src={closeIcon} />
        </button>

        <label className="absolute left-[32px] top-[104px] text-[15px] font-medium leading-[1.2] text-[#1A1A1A]">
          업무 명 <span className="text-[#E52E2E]">*</span>
        </label>
        <input
          value={values.title}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            update("title", event.target.value)
          }
          placeholder="업무 명을 작성해 주세요"
          className="absolute left-[32px] top-[129px] h-[36px] w-[414px] rounded-[7px] border border-[#969696] bg-transparent px-[11px] text-[12px] font-normal leading-[1.2] text-[#141414] outline-none placeholder:text-[#969696]"
        />

        <label className="absolute left-[32px] top-[191px] text-[15px] font-medium leading-[1.2] text-[#141414]">
          설명
        </label>
        <textarea
          value={values.description}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            update("description", event.target.value)
          }
          placeholder="업무에 대한 설명을 작성해 주세요"
          className="absolute left-[32px] top-[216px] h-[108px] w-[414px] resize-none rounded-[7px] border border-[#969696] bg-transparent px-[11px] py-[10px] text-[12px] font-normal leading-[1.2] text-[#141414] outline-none placeholder:text-[#969696]"
        />

        <label className="absolute left-[33px] top-[350px] text-[15px] font-medium leading-[1.2] text-[#141414]">
          담당자
        </label>
        <select
          value={values.assigneeId}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => {
            const selected = assigneeOptions.find((option) => option.value === event.target.value);
            onChange({
              ...values,
              assigneeId: event.target.value,
              assignee: selected?.label || "",
            });
          }}
          className="absolute left-[32px] top-[374px] h-[36px] w-[170px] rounded-[7px] border border-[#969696] bg-[#FFFDFD] px-[10px] text-[12px] font-normal leading-[1.2] text-[#141414] outline-none transition focus:border-[#623FB5]"
        >
          <option value="">담당자 없음</option>
          {assigneeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <label className="absolute left-[244px] top-[349px] text-[15px] font-medium leading-[1.2] text-[#141414]">
          마감 기한
        </label>
        <input
          type="date"
          value={values.dueDate}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            update("dueDate", event.target.value)
          }
          className="absolute left-[244px] top-[374px] h-[36px] w-[135px] rounded-[7px] border border-[#969696] bg-[#FFFDFD] px-[10px] text-[12px] font-normal leading-[1.2] text-[#141414] outline-none transition focus:border-[#623FB5]"
        />

        <label className="absolute left-[32px] top-[436px] text-[15px] font-medium leading-[1.2] text-[#141414]">
          우선순위 <span className="text-[#E52E2E]">*</span>
        </label>
        <div className="absolute left-[32px] top-[461px] flex gap-[10px]">
          {KANBAN_PRIORITIES.map((priority) => (
            <PriorityChip
              key={priority}
              priority={priority}
              selected={values.priority === priority}
              onClick={() => update("priority", priority)}
            />
          ))}
        </div>

        <label className="absolute left-[32px] top-[512px] text-[15px] font-medium leading-[1.2] text-[#141414]">
          {isEdit ? "상위 업무(수정 불가)" : "상위 업무"}
        </label>
        <div className="absolute left-[32px] top-[537px] flex w-[414px] gap-[10px] overflow-x-auto pb-[4px]">
          <OptionChip
            label="Epic 없음"
            selected={!values.parentKey}
            disabled={isEdit}
            onClick={() => onChange({ ...values, parentKey: "", category: "" })}
          />
          {parentOptions.map((option) => (
            <OptionChip
              key={option.value}
              label={option.label}
              selected={values.parentKey === option.value}
              disabled={isEdit}
              onClick={() =>
                onChange({
                  ...values,
                  parentKey: option.value,
                  category: option.label,
                })
              }
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="absolute left-[32px] top-[582px] flex h-[48px] w-[150px] items-center justify-center rounded-[7px] border-0 bg-[#DCD0FE] text-[17px] font-medium leading-[1.2] text-[#141414] transition-all duration-150 ease-out hover:bg-[#C4B6E5] active:scale-[0.98]"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          className={cn(
            "absolute left-[208px] top-[582px] flex h-[48px] w-[150px] items-center justify-center rounded-[7px] border-0 text-[17px] font-medium leading-[1.2] transition-all duration-150 ease-out",
            canSubmit
              ? "bg-[#623FB5] text-[#FFFDFD] hover:opacity-90 active:scale-[0.98]"
              : "cursor-not-allowed bg-[#969696] text-[#FFFDFD]",
          )}
        >
          {isEdit ? "저장" : "추가"}
        </button>

      </section>
    </>
  );
}
