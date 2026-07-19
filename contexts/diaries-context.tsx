import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { listVoiceDiaries, VoiceDiary } from "../lib/voice-diary-api";

type DiariesContextValue = {
  diaries: VoiceDiary[];
  hasLoaded: boolean;
  // Re-fetches from the database and updates the shared cache. Call this
  // when data must be fresh (e.g. the home screen on every focus); other
  // screens (e.g. the calendar) can just read `diaries` and skip fetching
  // entirely once `hasLoaded` is true.
  refresh: () => Promise<void>;
};

const DiariesContext = createContext<DiariesContextValue>({
  diaries: [],
  hasLoaded: false,
  refresh: async () => {},
});

export function DiariesProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [diaries, setDiaries] = useState<VoiceDiary[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!session) {
      setDiaries([]);
      setHasLoaded(true);
      return;
    }
    try {
      const fetched = await listVoiceDiaries();
      setDiaries(fetched);
    } catch {
      // 羊表示はおまけ機能のため、取得失敗時は静かに無視する
    } finally {
      setHasLoaded(true);
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      setDiaries([]);
      setHasLoaded(true);
    }
  }, [session]);

  return (
    <DiariesContext.Provider value={{ diaries, hasLoaded, refresh }}>
      {children}
    </DiariesContext.Provider>
  );
}

export function useDiaries() {
  return useContext(DiariesContext);
}
