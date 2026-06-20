import { useState } from "react";
import MemberInviteModal from "../../components/member/MemberInviteModal";
import MemberManagementPanel from "../../components/member/MemberManagementPanel";
import { INITIAL_MEMBERS } from "../../constants/memberManagement";
import type {
  MemberInviteCandidate,
  MemberRecord,
} from "../../types/memberManagement";

export default function MemberManagementPage() {
  const [members, setMembers] = useState<MemberRecord[]>(INITIAL_MEMBERS);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const removeMember = (memberId: number) => {
    setMembers((current) =>
      current.filter((member) => member.id !== memberId || member.authority === "creator"),
    );
  };

  const addMembers = (candidates: MemberInviteCandidate[]) => {
    setMembers((current) => {
      const existingMemberKeys = new Set(
        current.map((member) => `${member.name}:${member.email}`),
      );
      const addableCandidates = candidates.filter(
        (candidate) => !existingMemberKeys.has(`${candidate.name}:${candidate.email}`),
      );
      const nextId = Math.max(0, ...current.map((member) => member.id)) + 1;
      const newMembers: MemberRecord[] = addableCandidates.map((candidate, index) => ({
        id: nextId + index,
        name: candidate.name,
        email: candidate.email,
        department: candidate.department,
        position: candidate.role,
        job: "백엔드 개발",
        authority: "member",
      }));

      return [...current, ...newMembers];
    });
    setInviteModalOpen(false);
  };

  return (
    <div className="-m-6 min-h-screen overflow-x-hidden bg-[#fffdfd] pt-[64px] font-pretendard">
      <section className="min-h-[1016px] w-full min-w-0 px-[32px] pb-[72px] pt-[64px]">
        <MemberManagementPanel
          members={members}
          onInviteClick={() => setInviteModalOpen(true)}
          onRemoveMember={removeMember}
        />
      </section>
      {inviteModalOpen ? (
        <MemberInviteModal
          onAddMembers={addMembers}
          onClose={() => setInviteModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
