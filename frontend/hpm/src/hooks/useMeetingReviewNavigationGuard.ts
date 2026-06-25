import { useCallback, useEffect, useRef } from "react";
import { useBlocker } from "react-router-dom";

const DEFAULT_MESSAGE = "검토 단계를 완료해야 이동할 수 있습니다.";

export default function useMeetingReviewNavigationGuard(
  enabled: boolean,
  message = DEFAULT_MESSAGE,
) {
  const allowNavigationRef = useRef(false);

  const allowNavigation = useCallback(() => {
    allowNavigationRef.current = true;
  }, []);

  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    Boolean(
      enabled &&
        !allowNavigationRef.current &&
        currentLocation.pathname !== nextLocation.pathname,
    ),
  );

  useEffect(() => {
    if (blocker.state !== "blocked") return;

    alert(message);
    blocker.reset();
  }, [blocker, message]);

  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowNavigationRef.current) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled]);

  return allowNavigation;
}
