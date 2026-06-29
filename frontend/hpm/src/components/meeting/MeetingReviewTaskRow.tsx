import { useState } from "react";
import {
  MEETING_REVIEW_ASSIGNEES,
  MEETING_REVIEW_PRIORITIES,
} from "../../constants/meetingReview";
import type { MeetingReviewPriority, MeetingReviewTask } from "../../types/meetingReview";

interface MeetingReviewTaskRowProps {
  task: MeetingReviewTask;
  onChange: (task: MeetingReviewTask) => void;
  onRemove: (id: number) => void;
}

export default function MeetingReviewTaskRow({
  task,
  onChange,
  onRemove,
}: MeetingReviewTaskRowProps) {
  const [priorityOpen, setPriorityOpen] = useState(false);

  return (
    <div className="space-y-[0px]">
      <div className="relative h-[52px] rounded-[6px] border border-[#e0dedb] bg-white">
        <input
          className="absolute left-[8px] top-[11px] h-[28px] w-[295px] rounded-[6px] border border-[#e0dedb] px-[7px] text-[13px] text-[#111] outline-none placeholder:text-[#969696] focus:border-[#6A1FEB]"
          onChange={(event) => onChange({ ...task, title: event.target.value })}
          placeholder="새 업무를 입력하세요."
          value={task.title}
        />
        <button
          className="absolute left-[331px] top-[18px] border-0 bg-transparent p-0 text-[11px] text-[#6A1FEB]"
          type="button"
        >
          접기 ▲
        </button>
        <select
          className="absolute left-[369px] top-[11px] h-[28px] w-[116px] rounded-[6px] border border-[#e0dedb] bg-white px-[9px] text-[15px] text-[#111] outline-none focus:border-[#6A1FEB]"
          onChange={(event) => onChange({ ...task, assignee: event.target.value })}
          value={task.assignee}
        >
          {MEETING_REVIEW_ASSIGNEES.map((assignee) => (
            <option key={assignee} value={assignee}>
              {assignee}
            </option>
          ))}
        </select>
        <input
          className="absolute left-[499px] top-[11px] h-[28px] w-[130px] rounded-[6px] border border-[#e0dedb] bg-white px-[7px] text-[15px] text-[#111] outline-none transition focus:border-[#6A1FEB]"
          onChange={(event) => onChange({ ...task, dueDate: event.target.value })}
          type="date"
          value={task.dueDate}
        />
        <button
          className="absolute left-[643px] top-[11px] flex h-[28px] w-[112px] items-center justify-between rounded-[6px] border border-[#6A1FEB] bg-[#dcd0fe] px-[11px] text-left text-[11px] text-[#6A1FEB] outline-none transition-colors hover:bg-[#cfc0fb]"
          onClick={() => setPriorityOpen((current) => !current)}
          type="button"
        >
          <span>{task.priority}</span>
          <span className="text-[10px]">⌄</span>
        </button>
        <button
          aria-label="업무 삭제"
          className="absolute left-[776px] top-[16px] flex size-[20px] items-center justify-center rounded-full border-0 bg-transparent text-[18px] leading-none text-[#141414] hover:bg-[#f4f4f4]"
          onClick={() => onRemove(task.id)}
          type="button"
        >
          ×
        </button>
        {priorityOpen ? (
          <div className="absolute left-[643px] top-[43px] z-[60] w-[112px] overflow-hidden rounded-[6px] border border-[#6A1FEB] bg-white shadow-[0_10px_24px_rgba(20,20,20,0.10)]">
            {MEETING_REVIEW_PRIORITIES.map((priority) => {
              const selected = priority === task.priority;

              return (
                <button
                  className={`block h-[34px] w-full px-[11px] text-left text-[11px] transition-colors ${
                    selected
                      ? "bg-[#dcd0fe] text-[#6A1FEB]"
                      : "bg-white text-[#141414] hover:bg-[#f4f1ff] hover:text-[#6A1FEB]"
                  }`}
                  key={priority}
                  onClick={() => {
                    onChange({ ...task, priority: priority as MeetingReviewPriority });
                    setPriorityOpen(false);
                  }}
                  type="button"
                >
                  {priority}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
      <div className="h-[37px] overflow-hidden rounded-[6px] border border-[#eaeaea] bg-[#fbfbfb]">
        <input
          className="ml-[5px] mt-[4px] h-[28px] w-[782px] rounded-[6px] border border-[#e0dedb] bg-white px-[8px] text-[11px] text-[#111] outline-none placeholder:text-[#969696] focus:border-[#6A1FEB]"
          onChange={(event) => onChange({ ...task, description: event.target.value })}
          placeholder="업무 설명을 입력하세요."
          value={task.description}
        />
      </div>
    </div>
  );
}
