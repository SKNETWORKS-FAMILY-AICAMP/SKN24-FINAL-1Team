import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

const LS_KEY = "hpm_recording";

interface StoredState {
  meetingId: number | null;
  startTime: number | null;
  isPaused: boolean;
  pausedElapsed: number | null;
}

function loadStorage(): StoredState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { meetingId: null, startTime: null, isPaused: false, pausedElapsed: null };
    return JSON.parse(raw);
  } catch {
    return { meetingId: null, startTime: null, isPaused: false, pausedElapsed: null };
  }
}

interface RecordingCtx {
  meetingId: number | null;
  startTime: number | null;
  isPaused: boolean;
  pausedElapsed: number | null;
  startRecording: (id: number, existingElapsed?: number) => void;
  stopRecording: () => void;
  pauseRecording: (elapsedSeconds: number) => void;
  resumeRecording: () => void;
}

const RecordingContext = createContext<RecordingCtx | null>(null);

export function RecordingProvider({ children }: { children: ReactNode }) {
  const initial = loadStorage();
  const [meetingId, setMeetingId] = useState<number | null>(initial.meetingId);
  const [startTime, setStartTime] = useState<number | null>(initial.startTime);
  const [isPaused, setIsPaused] = useState<boolean>(initial.isPaused);
  const [pausedElapsed, setPausedElapsed] = useState<number | null>(initial.pausedElapsed);

  useEffect(() => {
    if (meetingId === null) {
      localStorage.removeItem(LS_KEY);
    } else {
      localStorage.setItem(LS_KEY, JSON.stringify({ meetingId, startTime, isPaused, pausedElapsed }));
    }
  }, [meetingId, startTime, isPaused, pausedElapsed]);

  const startRecording = useCallback((id: number, existingElapsed?: number) => {
    const adjustedStart = existingElapsed !== undefined
      ? Date.now() - existingElapsed * 1000
      : Date.now();
    setMeetingId(id);
    setStartTime(adjustedStart);
    setIsPaused(false);
    setPausedElapsed(null);
  }, []);

  const stopRecording = useCallback(() => {
    setMeetingId(null);
    setStartTime(null);
    setIsPaused(false);
    setPausedElapsed(null);
  }, []);

  const pauseRecording = useCallback((elapsedSeconds: number) => {
    setIsPaused(true);
    setPausedElapsed(elapsedSeconds);
  }, []);

  const resumeRecording = useCallback(() => {
    setPausedElapsed((pe) => {
      const newStart = pe !== null ? Date.now() - pe * 1000 : Date.now();
      setStartTime(newStart);
      return null;
    });
    setIsPaused(false);
  }, []);

  return (
    <RecordingContext.Provider value={{ meetingId, startTime, isPaused, pausedElapsed, startRecording, stopRecording, pauseRecording, resumeRecording }}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error("useRecording must be used within RecordingProvider");
  return ctx;
}
