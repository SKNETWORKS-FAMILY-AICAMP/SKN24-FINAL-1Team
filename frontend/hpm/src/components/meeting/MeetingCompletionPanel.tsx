import type {
  MeetingCompletionAction,
  MeetingCompletionContent,
} from "../../types/meetingCompletion";

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

interface MeetingCompletionPanelProps {
  content: MeetingCompletionContent;
  onAction: (action: MeetingCompletionAction) => void;
}

export default function MeetingCompletionPanel({
  content,
  onAction,
}: MeetingCompletionPanelProps) {
  return (
    <section className="mx-auto w-full max-w-[590px] text-center">
      <h1 className="m-0 border-b border-[#e6e1e6] pb-[14px] text-[32px] font-medium leading-[1.2] text-[#141414]">
        {content.title}
      </h1>
      <p className="mt-[18px] text-[20px] font-normal leading-[1.2] text-[#7c7c7c]">
        {content.description}
      </p>

      <div className="relative mx-auto mt-[74px] size-[120px] rounded-full bg-[#dcd0fe] text-[#623fb5]">
        <svg
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 size-[72px] -translate-x-[52%] -translate-y-[47%]"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            d="m5 12 4 4L19 6"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
      </div>

      <div className="mt-[98px] flex justify-center gap-[32px]">
        {content.actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onAction(action)}
            className={cn(
              "flex h-[57px] w-[256px] items-center justify-center rounded-[7px] border-0 text-[24px] font-medium leading-[1.2] tracking-[-0.72px] transition-all duration-150 ease-out active:scale-[0.98]",
              action.variant === "primary"
                ? "bg-[#623fb5] text-[#fffdfd] hover:bg-[#5635a8]"
                : "bg-[#dcd0fe] text-[#141414] hover:bg-[#cfc0fb]",
            )}
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}
