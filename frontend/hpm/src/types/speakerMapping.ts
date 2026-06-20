export type SpeakerMappingStepStatus = "active" | "pending";

export interface SpeakerMappingStep {
  id: string;
  label: string;
  status: SpeakerMappingStepStatus;
}

export interface SpeakerParticipant {
  id: string;
  name: string;
  position: string;
}

export interface SpeakerUtterance {
  id: string;
  time: string;
  content: string[];
  mappedParticipantId: string;
}

export interface SpeakerSegment {
  id: string;
  label: string;
  utteranceCount: number;
  mappedParticipantId: string;
  utterances: SpeakerUtterance[];
}
