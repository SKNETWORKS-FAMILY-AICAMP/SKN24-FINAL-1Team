import type { SpeakerMappingStep } from "../../types/speakerMapping";

interface SpeakerMappingStepperProps {
  steps: SpeakerMappingStep[];
}

export default function SpeakerMappingStepper({ steps }: SpeakerMappingStepperProps) {
  return (
    <div className="absolute left-1/2 top-[53px] z-10 h-[68px] w-[410px] -translate-x-1/2">
      <div className="absolute left-[62px] top-[17px] h-px w-[137px] rounded-[5px] bg-[#969696]" />
      <div className="absolute left-[233px] top-[17px] h-px w-[137px] rounded-[5px] bg-[#969696]" />

      {steps.map((step, index) => {
        const left = [36, 207, 378][index];
        const labelLeft = [0.5, 171.5, 342.5][index];
        const isActive = step.status === "active";

        return (
          <div key={step.id}>
            <div
              className={`absolute top-[4px] size-[26px] rounded-full ${
                isActive ? "bg-[#6A1FEB] shadow-[0_0_0_4px_rgba(98,63,181,0.14)]" : "bg-[#969696]"
              }`}
              style={{ left }}
            />
            <p
              className={`absolute top-[44px] -translate-x-1/2 whitespace-nowrap text-center text-[15px] font-normal ${
                isActive ? "text-[#6A1FEB]" : "text-[#969696]"
              }`}
              style={{ left: labelLeft + 49 }}
            >
              {step.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
