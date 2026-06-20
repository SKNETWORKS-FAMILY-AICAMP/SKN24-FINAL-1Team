import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SpeakerMappingCard from "../../components/meeting/SpeakerMappingCard";
import SpeakerMappingStepper from "../../components/meeting/SpeakerMappingStepper";
import {
  SPEAKER_MAPPING_STEPS,
  SPEAKER_PARTICIPANTS,
  SPEAKER_SEGMENTS,
} from "../../constants/speakerMapping";
import type { SpeakerSegment } from "../../types/speakerMapping";

const participantLabel = (participantId: string) => {
  const participant = SPEAKER_PARTICIPANTS.find((item) => item.id === participantId);

  return participant ? `${participant.name} (${participant.position})` : "선택 안 함";
};

export default function SpeakerMappingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const meetingId = Number(id);
  const [segments, setSegments] = useState<SpeakerSegment[]>(SPEAKER_SEGMENTS);
  const [activeSpeakerId, setActiveSpeakerId] = useState(SPEAKER_SEGMENTS[0]?.id ?? "");

  const activeSegment = useMemo(
    () => segments.find((segment) => segment.id === activeSpeakerId) ?? segments[0],
    [activeSpeakerId, segments],
  );

  const updateSegmentMapping = (participantId: string) => {
    setSegments((current) =>
      current.map((segment) =>
        segment.id === activeSegment.id
          ? {
              ...segment,
              mappedParticipantId: participantId,
            }
          : segment,
      ),
    );
  };

  const updateUtteranceMapping = (utteranceId: string, participantId: string) => {
    setSegments((current) =>
      current.map((segment) =>
        segment.id === activeSegment.id
          ? {
              ...segment,
              utterances: segment.utterances.map((utterance) =>
                utterance.id === utteranceId
                  ? { ...utterance, mappedParticipantId: participantId }
                  : utterance,
              ),
            }
          : segment,
      ),
    );
  };

  const applyAll = () => {
    setSegments((current) =>
      current.map((segment) =>
        segment.id === activeSegment.id
          ? {
              ...segment,
              utterances: segment.utterances.map((utterance) => ({
                ...utterance,
                mappedParticipantId: segment.mappedParticipantId,
              })),
            }
          : segment,
      ),
    );
  };

  const goNext = () => {
    navigate(Number.isFinite(meetingId) ? `/meetings/${meetingId}/minutes` : "/meetings");
  };

  return (
    <div className="-m-6 min-h-screen overflow-x-hidden overflow-y-auto bg-[#fffdfd] pt-[64px] font-pretendard">
      <section className="relative min-h-[1016px] w-full min-w-0 px-[32px] pb-[96px] pt-[200px]">
        <SpeakerMappingStepper steps={SPEAKER_MAPPING_STEPS} />

        <section className="relative mx-auto h-[680px] w-full max-w-[1280px] overflow-hidden rounded-[12px] border border-[#ebebed] bg-white">
          <div className="absolute left-[23px] top-[23px] flex gap-[14px]">
            {segments.map((segment) => {
              const active = segment.id === activeSegment.id;
              const utteranceCount = segment.utterances.length;

              return (
                <button
                  className={`flex h-[45px] w-[130px] items-center gap-[5px] rounded-[8px] px-[12px] py-[11px] text-left transition-colors ${
                    active
                      ? "bg-[#f2f0ff] text-[#623fb5]"
                      : "border border-[#e6e1e6] bg-[#fffdfd] text-[#4c4c54] hover:bg-[#f8f7fc]"
                  }`}
                  key={segment.id}
                  onClick={() => setActiveSpeakerId(segment.id)}
                  type="button"
                >
                  <span className="whitespace-nowrap text-[13px] font-semibold">{segment.label}</span>
                  <span
                    className={`flex h-[22px] min-w-[22px] items-center justify-center rounded-[11px] px-[6px] text-center text-[11px] font-semibold leading-none ${
                      active ? "bg-[#623fb5] text-white" : "bg-[#e6e1e6] text-[#141414]"
                    }`}
                  >
                    {utteranceCount}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="absolute left-[23px] top-[99px] m-0 whitespace-nowrap text-[15px] font-semibold text-[#1a1a1f]">
            {activeSegment.label} 의 발화 내역 ({activeSegment.utterances.length}건)
          </p>
          <p className="absolute left-[906px] top-[104px] m-0 whitespace-nowrap text-[15px] font-normal text-[#808087]">
            현재 매핑
          </p>

          <select
            aria-label="현재 매핑"
            className="absolute left-[980px] top-[90px] h-[46px] w-[173px] rounded-[8px] border border-[#e5e5e8] bg-[#fafafa] px-[14px] text-[15px] font-normal text-[#333338] outline-none focus:border-[#623fb5]"
            onChange={(event) => updateSegmentMapping(event.target.value)}
            value={activeSegment.mappedParticipantId}
          >
            {SPEAKER_PARTICIPANTS.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participantLabel(participant.id)}
              </option>
            ))}
          </select>

          <button
            className="absolute left-[1167px] top-[90px] flex h-[46px] items-center justify-center rounded-[8px] bg-[#623fb5] px-[14px] text-[13px] font-semibold text-white transition-colors hover:bg-[#5635a8] active:scale-[0.98]"
            onClick={applyAll}
            type="button"
          >
            전체 적용
          </button>

          <div className="absolute left-[23px] top-[149px] h-px w-[1224px] bg-[#ededf0]" />

          <div className="absolute bottom-[24px] left-[23px] top-[179px] flex w-[1224px] flex-col gap-[22px] overflow-y-auto pr-[8px]">
            {activeSegment.utterances.map((utterance) => (
              <SpeakerMappingCard
                defaultParticipantId={activeSegment.mappedParticipantId}
                key={utterance.id}
                participants={SPEAKER_PARTICIPANTS}
                utterance={utterance}
                onMappingChange={updateUtteranceMapping}
              />
            ))}
          </div>
        </section>

        <div className="mx-auto mt-[17px] flex w-full max-w-[1280px] justify-end">
          <button
            className="flex h-[48px] w-[150px] items-center justify-center rounded-[7px] bg-[#623fb5] text-[17px] font-medium tracking-[-0.51px] text-[#fdfdfd] transition-colors hover:bg-[#5635a8] active:scale-[0.98]"
            onClick={goNext}
            type="button"
          >
            다음
          </button>
        </div>
      </section>
    </div>
  );
}
