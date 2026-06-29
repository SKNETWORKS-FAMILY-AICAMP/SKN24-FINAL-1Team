import type {
  MeetingEmailContent,
  MeetingEmailRecipient,
} from "../../types/meetingEmail";

interface MeetingEmailPanelProps {
  content: MeetingEmailContent;
  mailSent: boolean;
  recipientQuery: string;
  recipients: MeetingEmailRecipient[];
  onAddRecipient: (recipient: MeetingEmailRecipient) => void;
  onRecipientQueryChange: (query: string) => void;
  onRemoveRecipient: (recipientId: string) => void;
  onSend: () => void;
}

function PriorityBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-[26px] w-[50px] items-center justify-center rounded-[6px] bg-[#ede8ff] text-[15px] font-medium text-[#7361e5]">
      {label}
    </span>
  );
}

export default function MeetingEmailPanel({
  content,
  mailSent,
  recipientQuery,
  recipients,
  onAddRecipient,
  onRecipientQueryChange,
  onRemoveRecipient,
  onSend,
}: MeetingEmailPanelProps) {
  const recipientText =
    recipients.length > 0
      ? recipients.map((recipient) => recipient.name).join(", ")
      : "수신자 없음";
  const selectedRecipientIds = new Set(recipients.map((recipient) => recipient.id));
  const selectedRecipientKeys = new Set(
    recipients.map((recipient) => `${recipient.name}:${recipient.role}`),
  );
  const normalizedRecipientQuery = recipientQuery.trim().toLowerCase();
  const matchingRecipients = normalizedRecipientQuery
    ? content.recipientOptions
        .filter((recipient) => {
          const recipientKey = `${recipient.name}:${recipient.role}`;

          if (
            selectedRecipientIds.has(recipient.id) ||
            selectedRecipientKeys.has(recipientKey)
          ) {
            return false;
          }

          return [
            recipient.name,
            recipient.role,
            recipient.email,
            recipient.department,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(normalizedRecipientQuery);
        })
        .slice(0, 5)
    : [];

  return (
    <section className="mx-auto w-full min-w-0 max-w-[1385px]" data-node-id="117:6414">
      <header>
        <h1 className="m-0 text-[20px] font-medium leading-[1.2] text-black">
          {content.heading}
        </h1>
        <p className="mt-[4px] text-[15px] font-normal leading-[1.2] text-[rgba(0,0,0,0.53)]">
          {content.subheading}
        </p>
      </header>

      <div className="mt-[18px] grid min-w-0 grid-cols-1 gap-[40px] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:gap-[52px]">
        <section className="h-[604px] w-full min-w-0 max-w-[640px] overflow-hidden rounded-[12px] border border-[#ebebed] bg-white px-[31px] py-[27px]">
          <h2 className="m-0 text-[17px] font-medium leading-[1.2] text-[#1a1a1f]">
            회의 제목(수정 불가)
          </h2>
          <p className="mt-[20px] text-[15px] font-normal leading-[1.2] text-[#404047]">
            {content.meeting.title}
          </p>

          <div className="mt-[28px] h-px w-full bg-[#ededf0]" />

          <h2 className="mt-[22px] text-[17px] font-medium leading-[1.2] text-[#1a1a1f]">
            회의 정보
          </h2>
          <dl className="mt-[25px] grid grid-cols-[120px_1fr] gap-y-[16px] text-[15px] leading-[1.2]">
            <dt className="font-medium text-[#808087]">회의 일시</dt>
            <dd className="m-0 text-[#26262b]">{content.meeting.dateTime}</dd>
            <dt className="font-medium text-[#808087]">회의 참여자</dt>
            <dd className="m-0 text-[#26262b]">{content.meeting.participants}</dd>
          </dl>

          <div className="mt-[28px] h-px w-full bg-[#ededf0]" />

          <h2 className="mt-[22px] text-[17px] font-medium leading-[1.2] text-[#1a1a1f]">
            부여된 태스크
          </h2>
          <div className="mt-[24px] grid grid-cols-[minmax(0,1fr)_70px_112px_50px] items-center gap-x-[10px] border-b border-[#ededf0] pb-[14px] text-[13px] font-semibold leading-[1.2] text-[#66666e]">
            <span>태스크</span>
            <span>담당자</span>
            <span>기한</span>
            <span>우선순위</span>
          </div>
          <div className="mt-[14px] flex flex-col gap-[20px] text-[14px] leading-[1.2] text-[#26262b]">
            {content.tasks.map((task) => (
              <div
                key={task.id}
                className="grid grid-cols-[minmax(0,1fr)_70px_112px_50px] items-center gap-x-[10px]"
              >
                <span className="truncate">{task.title}</span>
                <span className="font-medium">{task.assignee}</span>
                <span>{task.dueDate}</span>
                <PriorityBadge label={task.priority} />
              </div>
            ))}
          </div>
        </section>

        <section className="h-[614px] w-full min-w-0 max-w-[649px] overflow-hidden rounded-[12px] border border-[#ebebed] bg-white px-[31px] py-[27px]">
          <h2 className="m-0 text-[17px] font-medium leading-[1.2] text-[#1a1a1f]">
            이메일 미리보기
          </h2>
          <div className="mt-[28px] h-[514px] overflow-hidden rounded-[10px] border border-[#f0f0f2] bg-[#fafafb] px-[31px] py-[31px] text-[13px] leading-[24px] text-[#26262b]">
            <p className="m-0">안녕하세요, OOO님.</p>
            <p className="mt-[14px]">
              회의록이 확정되었습니다. 아래 태스크가 회원님께 부여되었으니
              <br />
              기한 내에 처리해 주세요.
            </p>

            <p className="mt-[24px] font-medium text-[#1a1a1f]">[회의 정보]</p>
            <p className="mt-[14px]">• 회의 제목: {content.meeting.title}</p>
            <p>• 회의 일시: {content.meeting.dateTime}</p>

            <p className="mt-[24px] font-medium text-[#1a1a1f]">[부여된 태스크]</p>
            <div className="mt-[14px] flex flex-col gap-[3px]">
              {content.tasks.map((task, index) => (
                <p key={task.id} className="m-0">
                  {index + 1}. {task.title} (담당자: {task.assignee}, 기한:{" "}
                  {task.dueDate.replace(/ \(.+\)/, "")}, 우선순위: {task.priority})
                </p>
              ))}
            </div>

            <p className="mt-[24px]">프로젝트에서 더 자세한 내용을 확인하실 수 있습니다.</p>
            <p>감사합니다.</p>
          </div>
        </section>
      </div>

      <div className="mt-[10px] flex min-w-0 flex-col gap-[24px] xl:flex-row xl:items-start xl:justify-between">
        <section className="min-w-0">
          <h2 className="m-0 text-[17px] font-medium leading-[1.2] text-black">
            이메일 수신자
          </h2>
          <div className="mt-[14px] min-h-[90px] w-full max-w-[694px] rounded-[20px] border border-black bg-[#fffdfd] px-[22px] py-[14px]">
            <div className="flex flex-col gap-[10px]">
              <div className="flex flex-wrap gap-[10px]">
              {recipients.map((recipient) => (
                <span
                  key={recipient.id}
                  className="flex h-[32px] w-[121px] items-center justify-between rounded-[8px] border border-[#e0dedb] bg-[#faf9f7] px-[10px] text-[13px] text-[#111]"
                >
                  <span className="truncate">
                    {recipient.name} {recipient.role}
                  </span>
                  <button
                    type="button"
                    aria-label={`${recipient.name} 수신자 제거`}
                    onClick={() => onRemoveRecipient(recipient.id)}
                    className="ml-[8px] flex size-[16px] items-center justify-center rounded-full border-0 bg-transparent p-0 text-[11px] text-[#aaa] transition-colors hover:bg-[#eee] hover:text-[#141414]"
                  >
                    x
                  </button>
                </span>
              ))}
              </div>
              <div>
              <input
                value={recipientQuery}
                onChange={(event) => onRecipientQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Backspace" &&
                    recipientQuery.length === 0 &&
                    recipients.length > 0
                  ) {
                    event.preventDefault();
                    onRemoveRecipient(recipients[recipients.length - 1].id);
                    return;
                  }

                  if (event.key === "Enter" && matchingRecipients[0]) {
                    event.preventDefault();
                    onAddRecipient(matchingRecipients[0]);
                  }
                }}
                placeholder="이름 또는 이메일 검색"
                className="h-[32px] w-full border-0 bg-transparent px-[2px] text-[13px] text-[#111] outline-none placeholder:text-[#969696]"
              />
              </div>
            </div>
          </div>
          {recipientQuery.trim() ? (
            <div className="mt-[8px] w-full max-w-[320px] rounded-[8px] border border-[#e0dedb] bg-white shadow-[0_10px_24px_rgba(20,20,20,0.12)]">
                {matchingRecipients.length > 0 ? (
                  matchingRecipients.map((recipient) => (
                    <button
                      key={recipient.id}
                      type="button"
                      onClick={() => onAddRecipient(recipient)}
                      className="flex h-[46px] w-full min-w-0 items-center justify-between gap-[12px] border-0 bg-white px-[14px] text-left transition-colors hover:bg-[#f4f1ff]"
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="text-[13px] font-medium text-[#111]">
                          {recipient.name} {recipient.role}
                        </span>
                        <span className="truncate text-[11px] text-[#969696]">
                          {recipient.department}
                        </span>
                      </span>
                      <span className="max-w-[150px] truncate text-[11px] text-[#969696]">
                        {recipient.email}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="m-0 px-[14px] py-[12px] text-[15px] text-[#969696]">
                    검색 결과가 없습니다.
                  </p>
                )}
              </div>
            ) : null}
        </section>

        <div className="flex flex-col items-start gap-[12px] xl:items-end xl:pt-[21px]">
          <button
            type="button"
            disabled={recipients.length === 0}
            onClick={onSend}
            className="flex h-[48px] w-[150px] items-center justify-center rounded-[7px] border-0 bg-[#6A1FEB] text-[17px] font-medium leading-[1.2] text-[#fffdfd] transition-all duration-150 ease-out hover:bg-[#5635a8] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#969696]"
          >
            이메일 발송
          </button>
          {mailSent ? (
            <p className="m-0 text-[15px] text-[#6A1FEB]">
              {recipientText}에게 이메일 발송 완료
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
