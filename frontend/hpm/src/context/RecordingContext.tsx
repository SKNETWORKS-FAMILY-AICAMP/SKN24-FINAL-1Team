import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const LS_KEY = "hpm_recording";

function loadStorage(): { meetingId: number | null; startTime: number | null } {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { meetingId: null, startTime: null };
    return JSON.parse(raw);
  } catch {
    return { meetingId: null, startTime: null };
  }
}

function saveStorage(meetingId: number | null, startTime: number | null) {
  if (meetingId === null) {
    localStorage.removeItem(LS_KEY);
  } else {
    localStorage.setItem(LS_KEY, JSON.stringify({ meetingId, startTime }));
  }
}

interface RecordingCtx {
  meetingId: number | null;
  startTime: number | null;
  startRecording: (id: number) => void;
  stopRecording: () => void;
}

const RecordingContext = createContext<RecordingCtx | null>(null);

export function RecordingProvider({ children }: { children: ReactNode }) {
  const initial = loadStorage();
  const [meetingId, setMeetingId] = useState<number | null>(initial.meetingId);
  const [startTime, setStartTime] = useState<number | null>(initial.startTime);

  const startRecording = useCallback((id: number) => {
    const now = Date.now();
    setMeetingId(id);
    setStartTime(now);
    saveStorage(id, now);
  }, []);

  const stopRecording = useCallback(() => {
    setMeetingId(null);
    setStartTime(null);
    saveStorage(null, null);
  }, []);

  return (
    <RecordingContext.Provider value={{ meetingId, startTime, startRecording, stopRecording }}>
      {children}
    </RecordingContext.Provider>
  );
}

export function useRecording() {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error("useRecording must be used within RecordingProvider");
  return ctx;
}
