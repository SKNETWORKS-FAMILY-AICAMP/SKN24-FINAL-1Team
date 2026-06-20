import type { SpeakerMappingStep } from "./speakerMapping";

export type MeetingCompletionActionId = "skip" | "confirm";

export type MeetingCompletionActionVariant = "secondary" | "primary";

export interface MeetingCompletionAction {
  id: MeetingCompletionActionId;
  label: string;
  variant: MeetingCompletionActionVariant;
}

export interface MeetingCompletionContent {
  steps: SpeakerMappingStep[];
  title: string;
  description: string;
  actions: MeetingCompletionAction[];
}
