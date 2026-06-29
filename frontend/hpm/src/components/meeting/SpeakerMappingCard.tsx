import type { SpeakerParticipant, SpeakerUtterance } from "../../types/speakerMapping";

interface SpeakerMappingCardProps {
  participants: SpeakerParticipant[];
  utterance: SpeakerUtterance;
  onMappingChange: (utteranceId: string, participantId: string) => void;
}

const participantLabel = (participant?: SpeakerParticipant) => {
  if (!participant || participant.id === "") {
    return "선택 안 함";
  }

  return participant.position ? `${participant.name} (${participant.position})` : participant.name;
};

export default function SpeakerMappingCard({
  participants,
  utterance,
  onMappingChange,
}: SpeakerMappingCardProps) {
  const changed = Boolean(utterance.isOverride);

  return (
    <div className="grid grid-cols-[90px_1fr_54px_230px] items-start gap-0">
      <p className="m-0 pt-[5px] text-[13px] font-medium text-[#8c8c94]">{utterance.time}</p>
      <div className="min-h-[38px] pr-[18px] text-[14.5px] font-normal leading-[24px] text-[#26262b]">
        {utterance.content.map((line) => (
          <p className="m-0" key={line}>
            {line}
          </p>
        ))}
      </div>
      <div className="pt-[6px]">
        {changed ? (
          <span className="inline-flex h-[24px] w-[54px] items-center justify-center rounded-[6px] bg-[#f2f0ff] text-[11px] font-semibold text-[#6357f2]">
            변경됨
          </span>
        ) : null}
      </div>
      <select
        aria-label={`${utterance.time} 발화 매핑`}
        className="h-[38px] w-[230px] rounded-[8px] border border-[#e5e5e8] bg-[#fafafa] px-[13px] text-[12.5px] font-medium text-[#333338] outline-none transition-colors hover:border-[#cfcfd6] focus:border-[#623fb5]"
        onChange={(event) => onMappingChange(utterance.id, event.target.value)}
        value={utterance.mappedParticipantId}
      >
        {participants.map((participant) => (
          <option key={participant.id} value={participant.id}>
            {participantLabel(participant)}
          </option>
        ))}
      </select>
    </div>
  );
}
