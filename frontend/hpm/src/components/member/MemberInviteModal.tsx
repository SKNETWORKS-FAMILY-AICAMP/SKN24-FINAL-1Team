import { useMemo, useState } from "react";
import type { MemberInviteCandidate } from "../../types/memberManagement";

interface MemberInviteModalProps {
  candidates: MemberInviteCandidate[];
  loading?: boolean;
  submitting?: boolean;
  onAddMembers: (members: MemberInviteCandidate[]) => void | Promise<void>;
  onClose: () => void;
}

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="size-[10px]" fill="none" viewBox="0 0 12 12">
      <path
        d="m2 2 8 8m0-8-8 8"
        stroke="currentColor"
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
        "flex h-[48px] w-full flex-col items-start justify-center rounded-[3px] px-[14px] text-left transition-colors",
        active ? "bg-[#e4e3eb]" : "bg-transparent hover:bg-[#f4f4f8]",
      )}
    >
      <span className="text-[12px] font-normal leading-[1.2] text-[#141414]">
        {candidate.name} {candidate.role}({candidate.email})
      </span>
      <span className="mt-[6px] text-[12px] font-normal leading-[1.2] text-[#6b6b6b]">
        {candidate.department}
      </span>
    </button>
  );
}

export default function MemberInviteModal({
  candidates,
  loading = false,
  submitting = false,
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
  const matchingMembers = candidates
    .filter((candidate) => {
      if (selectedIds.has(candidate.id)) return false;
      if (!normalizedQuery) return true;

      return [
        candidate.name,
        candidate.role,
        candidate.email,
        candidate.department,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    })
    ;

  const selectMember = (candidate: MemberInviteCandidate) => {
    setSelectedMembers((current) => {
      if (current.some((member) => member.id === candidate.id)) return current;
      return [...current, candidate];
    });
    setQuery("");
  };

  const removeMember = (candidateId: number) => {
    setSelectedMembers((current) => current.filter((member) => member.id !== candidateId));
  };

  const handleSubmit = () => {
    if (selectedMembers.length === 0 || submitting) return;
    void onAddMembers(selectedMembers);
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
        aria-label="구성원 추가"
        className="flex w-[min(736px,calc(100vw-48px))] flex-col rounded-[12px] bg-[#ececf2] p-[32px]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="rounded-[7px] border border-[#969696] bg-[#fffdfd] px-[14px] py-[13px]">
          <div className="flex min-h-[58px] flex-wrap items-center gap-[14px]">
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
                  className="ml-[8px] flex size-[16px] shrink-0 items-center justify-center rounded-full text-[#141414] transition-colors hover:bg-[#e7e3ed]"
                >
                  <CloseIcon />
                </button>
              </span>
            ))}
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Backspace" && query.length === 0 && selectedMembers.length > 0) {
                  event.preventDefault();
                  removeMember(selectedMembers[selectedMembers.length - 1].id);
                  return;
                }

                if (event.key === "Enter" && matchingMembers[0]) {
                  event.preventDefault();
                  selectMember(matchingMembers[0]);
                }

                if (event.key === "Escape") onClose();
              }}
              autoFocus
              placeholder={selectedMembers.length > 0 ? "" : "이름이나 이메일, 부서를 입력해주세요"}
              className="h-[32px] min-w-[180px] flex-1 border-0 bg-transparent text-[15px] text-[#141414] outline-none placeholder:text-[#7c7c7c]"
            />
          </div>
        </div>

        <div className="mt-[7px] rounded-[7px] border border-[#969696] bg-[#fffdfd] overflow-hidden" style={{ height: "164px" }}>
          <div className="h-full overflow-y-auto p-[7px]">
            {loading ? (
              <p className="m-0 px-[8px] py-[12px] text-[12px] text-[#6b6b6b]">
                구성원을 불러오는 중입니다.
              </p>
            ) : matchingMembers.length > 0 ? (
              <div className="flex flex-col gap-[3px]">
                {matchingMembers.map((candidate) => (
                  <CandidateOption
                    key={candidate.id}
                    active={false}
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
        </div>

        <div className="mt-[24px] flex justify-end">
          <button
            type="button"
            disabled={selectedMembers.length === 0 || submitting}
            onClick={handleSubmit}
            className="h-[42px] w-[120px] rounded-[7px] border-0 bg-[#623fb5] text-[15px] font-medium text-[#fdfdfd] transition-all duration-150 hover:bg-[#5635a8] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#969696]"
          >
            {submitting ? "추가 중" : "추가하기"}
          </button>
        </div>
      </section>
    </div>
  );
}
