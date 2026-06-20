import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MeetingJiraRegisterPanel from "../../components/meeting/MeetingJiraRegisterPanel";
import { MEETING_JIRA_CONTENT } from "../../constants/meetingJira";

export default function MeetingJiraRegisterPage() {
  const navigate = useNavigate();
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [registering, setRegistering] = useState(false);

  const toggleTask = (taskId: number) => {
    if (registering) {
      return;
    }

    setSelectedTaskIds((current) => {
      const next = new Set(current);

      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }

      return next;
    });
  };

  const registerTasks = () => {
    if (selectedTaskIds.size === 0) {
      return;
    }

    setRegistering(true);

    window.setTimeout(() => {
      navigate("/meetings");
    }, 700);
  };

  return (
    <div className="-m-6 min-h-screen overflow-x-hidden bg-[#fffdfd] pt-[64px] font-pretendard">
      <section className="min-h-[1016px] w-full min-w-0 px-[32px] pb-[96px] pt-[148px]">
        <MeetingJiraRegisterPanel
          content={MEETING_JIRA_CONTENT}
          registering={registering}
          selectedTaskIds={selectedTaskIds}
          onRegister={registerTasks}
          onToggleTask={toggleTask}
        />
      </section>
    </div>
  );
}
