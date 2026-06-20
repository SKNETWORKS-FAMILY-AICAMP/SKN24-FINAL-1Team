import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MeetingEmailPanel from "../../components/meeting/MeetingEmailPanel";
import { MEETING_EMAIL_CONTENT } from "../../constants/meetingEmail";
import type { MeetingEmailRecipient } from "../../types/meetingEmail";

export default function MeetingEmailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const meetingId = Number(id);
  const [mailSent, setMailSent] = useState(false);
  const [recipients, setRecipients] = useState(MEETING_EMAIL_CONTENT.recipients);
  const [recipientQuery, setRecipientQuery] = useState("");

  const removeRecipient = (recipientId: string) => {
    setRecipients((current) =>
      current.filter((recipient) => recipient.id !== recipientId),
    );
    setMailSent(false);
  };

  const addRecipient = (recipient: MeetingEmailRecipient) => {
    setRecipients((current) => {
      if (current.some((item) => item.id === recipient.id)) {
        return current;
      }

      return [...current, recipient];
    });
    setRecipientQuery("");
    setMailSent(false);
  };

  const sendEmail = () => {
    setMailSent(true);

    window.setTimeout(() => {
      navigate(Number.isFinite(meetingId) ? `/meetings/${meetingId}/jira-register` : "/meetings");
    }, 700);
  };

  return (
    <div className="-m-6 min-h-screen overflow-x-hidden bg-[#fffdfd] pt-[64px] font-pretendard">
      <section className="min-h-[1016px] w-full min-w-0 px-[32px] pb-[32px] pt-[111px]">
        <MeetingEmailPanel
          content={MEETING_EMAIL_CONTENT}
          mailSent={mailSent}
          recipientQuery={recipientQuery}
          recipients={recipients}
          onAddRecipient={addRecipient}
          onRecipientQueryChange={setRecipientQuery}
          onRemoveRecipient={removeRecipient}
          onSend={sendEmail}
        />
      </section>
    </div>
  );
}
