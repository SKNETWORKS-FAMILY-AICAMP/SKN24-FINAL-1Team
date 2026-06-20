import { useMemo, useState } from "react";
import { MEMBER_INVITE_CANDIDATES } from "../../constants/memberManagement";
import type { MemberInviteCandidate } from "../../types/memberManagement";

interface MemberInviteModalProps {
  onAddMembers: (members: MemberInviteCandidate[]) => void;
  onClose: () => void;
}

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="size-[9px]" fill="none" viewBox="0 0 12 12">
      <path
        d="m2 2 8 8m0-8-8 8"
        stroke="#141414"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function CandidateOption({
  active,
  candidate,
  onSelect,
}: {
  active: boolean;
  candidate: MemberInviteCandidate;
  onSelect: (candidate: MemberInviteCandidate) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(candidate)}
      className={cn(
        "flex h-[42px] w-full flex-col items-start justify-center rounded-[3px] border-0 px-[7px] text-left transition-colors",
        active ? "bg-[#ececf2]" : "bg-transparent hover:bg-[#f4f4f8]",
      )}
    >
      <span className="text-[12px] font-normal leading-[1.2] text-[#141414]">
        {candidate.name} {candidate.role}({candidate.email})
      </span>
      <span className="mt-[4px] text-[12px] font-normal leading-[1.2] text-[#6b6b6b]">
        {candidate.department}
      </span>
    </button>
  );
}

export default function MemberInviteModal({
  onAddMembers,
  onClose,
}: MemberInviteModalProps) {
  const [query, setQuery] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<MemberInviteCandidate[]>([]);

  const selectedIds = useMemo(
    () => new Set(selectedMembers.map((member) => member.id)),
    [selectedMembers],
  );
  const normalizedQuery = query.trim().toLowerCase();
  const matchingMembers = MEMBER_INVITE_CANDIDATES.filter((candidate) => {
    if (selectedIds.has(candidate.id)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return [
      candidate.name,
      candidate.role,
      candidate.email,
      candidate.department,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  }).slice(0, 3);

  const inputExpanded = selectedMembers.length > 0;

  const selectMember = (candidate: MemberInviteCandidate) => {
    setSelectedMembers((current) => {
      if (current.some((member) => member.id === candidate.id)) {
        return current;
      }

      return [...current, candidate];
    });
    setQuery("");
  };

  const removeMember = (candidateId: string) => {
    setSelectedMembers((current) => current.filter((member) => member.id !== candidateId));
  };

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/20 px-[24px]"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="구성원 초대"
        data-node-id={inputExpanded ? "128:7637" : "128:7631"}
        className="flex min-h-[365px] w-[min(736px,calc(100vw-48px))] max-w-[calc(100vw-48px)] flex-col rounded-[12px] bg-[#ececf2] p-[32px] transition-[width,min-height] duration-200 ease-out"
        style={{
          minHeight: inputExpanded
            ? Math.min(620, 365 + Math.floor(selectedMembers.length / 4) * 48)
            : 365,
          width: inputExpanded
            ? `min(920px, calc(100vw - 48px))`
            : `min(736px, calc(100vw - 48px))`,
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div
          className={cn(
            "w-full rounded-[7px] border border-[#969696] bg-[#fffdfd] px-[14px]",
            inputExpanded ? "min-h-[86px] py-[13px]" : "h-[58px]",
          )}
        >
          <div className="flex flex-wrap items-center gap-[14px]">
            {selectedMembers.map((member) => (
              <span
                key={member.id}
                className="flex h-[32px] w-[121px] items-center justify-between rounded-[8px] border border-[#e0dedb] bg-[#f6f5fa] px-[9px] text-[12px] text-[#141414]"
              >
                <span className="truncate">
                  {member.name} {member.role}
                </span>
                <button
                  type="button"
                  aria-label={`${member.name} 제거`}
                  onClick={() => removeMember(member.id)}
                  className="ml-[8px] flex size-[16px] shrink-0 items-center justify-center rounded-full border-0 bg-transparent p-0 transition-colors hover:bg-[#e7e3ed]"
                >
                  <CloseIcon />
                </button>
              </span>
            ))}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Backspace" &&
                  query.length === 0 &&
                  selectedMembers.length > 0
                ) {
                  event.preventDefault();
                  removeMember(selectedMembers[selectedMembers.length - 1].id);
                  return;
                }

                if (event.key === "Enter" && matchingMembers[0]) {
                  event.preventDefault();
                  selectMember(matchingMembers[0]);
                }

                if (event.key === "Escape") {
                  onClose();
                }
              }}
              autoFocus
              placeholder={
                selectedMembers.length > 0
                  ? ""
                  : "이름이나 이메일, 부서를 입력해주세요"
              }
              className={cn(
                "min-w-[220px] flex-1 border-0 bg-transparent text-[15px] text-[#141414] outline-none placeholder:text-[#7c7c7c]",
                inputExpanded ? "h-[32px]" : "h-[56px]",
              )}
            />
          </div>
        </div>

        {inputExpanded || query.trim() ? (
          <div className="mt-[7px] h-[152px] w-full rounded-[7px] border border-[#969696] bg-[#fffdfd] p-[7px]">
            {matchingMembers.length > 0 ? (
              <div className="flex flex-col gap-[3px]">
                {matchingMembers.map((candidate, index) => (
                  <CandidateOption
                    key={candidate.id}
                    active={index === 1}
                    candidate={candidate}
                    onSelect={selectMember}
                  />
                ))}
              </div>
            ) : (
              <p className="m-0 px-[8px] py-[12px] text-[12px] text-[#6b6b6b]">
                검색 결과가 없습니다.
              </p>
            )}
          </div>
        ) : null}

        <div className="mt-auto flex justify-end pt-[24px]">
          <button
            type="button"
            disabled={selectedMembers.length === 0}
            onClick={() => onAddMembers(selectedMembers)}
            className="h-[42px] w-[120px] rounded-[7px] border-0 bg-[#623fb5] text-[15px] font-medium text-[#fdfdfd] transition-all duration-150 hover:bg-[#5635a8] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#969696]"
          >
            추가하기
          </button>
        </div>
      </section>
    </div>
  );
}
