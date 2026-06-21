import { useCallback, useEffect, useMemo, useState } from "react";
import MemberInviteModal from "../../components/member/MemberInviteModal";
import MemberManagementPanel from "../../components/member/MemberManagementPanel";
import { useAuth } from "../../context/AuthContext";
import {
  addProjectMembers,
  getProjectDetail,
  getUserList,
  type ProjectDetail,
  type UserListItem,
} from "../../services/meeting";
import type {
  MemberInviteCandidate,
  MemberRecord,
} from "../../types/memberManagement";

const toMemberRecord = (project: ProjectDetail, member: ProjectDetail["members"][number]): MemberRecord => ({
  id: member.user_id,
  name: member.name,
  email: member.email,
  department: member.dept_name,
  position: member.rank_name,
  job: member.work,
  authority: member.user_id === project.project_owner ? "creator" : "member",
});

const toInviteCandidate = (user: UserListItem): MemberInviteCandidate => ({
  id: user.users_id,
  name: user.name,
  email: user.email,
  department: user.dept_name || "",
  role: user.rank_name || user.work || "",
});

export default function MemberManagementPage() {
  const { projectId, user } = useAuth();
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [candidates, setCandidates] = useState<MemberInviteCandidate[]>([]);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [canInvite, setCanInvite] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);

  const loadProjectMembers = useCallback(async () => {
    if (!projectId) {
      setMembers([]);
      setCanInvite(false);
      return;
    }

    setLoadingMembers(true);
    try {
      const project = await getProjectDetail(projectId);
      setCanInvite(project.project_owner === user?.users_id);
      setMembers(project.members.map((member) => toMemberRecord(project, member)));
    } catch {
      setMembers([]);
      setCanInvite(false);
    } finally {
      setLoadingMembers(false);
    }
  }, [projectId, user?.users_id]);

  const loadCandidates = useCallback(async () => {
    setLoadingCandidates(true);
    try {
      const users = await getUserList();
      setCandidates(users.map(toInviteCandidate));
    } catch {
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }, []);

  useEffect(() => {
    void loadProjectMembers();
  }, [loadProjectMembers]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const inviteCandidates = useMemo(() => {
    const memberIds = new Set(members.map((member) => member.id));
    return candidates.filter((candidate) => !memberIds.has(candidate.id));
  }, [candidates, members]);

  const addMembers = async (selectedCandidates: MemberInviteCandidate[]) => {
    if (!projectId || selectedCandidates.length === 0) return;

    setAddingMembers(true);
    try {
      await addProjectMembers(
        projectId,
        selectedCandidates.map((candidate) => candidate.id),
      );
      await loadProjectMembers();
      setInviteModalOpen(false);
    } finally {
      setAddingMembers(false);
    }
  };

  return (
    <div className="-m-6 min-h-screen overflow-x-hidden bg-[#fffdfd] pt-[64px] font-pretendard">
      <section className="min-h-[1016px] w-full min-w-0 px-[32px] pb-[72px] pt-[64px]">
        <MemberManagementPanel
          members={members}
          canInvite={canInvite}
          onInviteClick={() => {
            if (projectId && canInvite && !loadingMembers) setInviteModalOpen(true);
          }}
        />
      </section>
      {inviteModalOpen ? (
        <MemberInviteModal
          candidates={inviteCandidates}
          loading={loadingCandidates}
          submitting={addingMembers}
          onAddMembers={addMembers}
          onClose={() => setInviteModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
