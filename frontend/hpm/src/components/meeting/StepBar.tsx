interface StepBarProps {
  steps: string[];
  activeStep: number; // 1-indexed
}

export default function StepBar({ steps, activeStep }: StepBarProps) {
  return (
    <div className="flex items-start justify-center gap-3 mb-8">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < activeStep;
        const isActive = stepNum === activeStep;

        return (
          <div key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center" style={{ minWidth: 130 }}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${isCompleted || isActive
                    ? "bg-indigo-600 text-white"
                    : "border-2 border-gray-300 text-gray-400 bg-white"}`}
              >
                {isCompleted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  stepNum
                )}
              </div>
              <span
                className={`text-xs mt-1.5 text-center leading-snug
                  ${isActive ? "text-indigo-600 font-semibold" : isCompleted ? "text-indigo-400" : "text-gray-400"}`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className="text-gray-300 text-lg mt-1">›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
