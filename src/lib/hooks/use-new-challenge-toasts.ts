import type { DailyChallenge } from '@/features/focus/api';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useNewChallengeToasts(
  challenges: DailyChallenge[] | undefined,
): [DailyChallenge[], (id: string) => void] {
  const knownIdsRef = useRef<Set<string> | null>(null);
  const [queue, setQueue] = useState<DailyChallenge[]>([]);

  useEffect(() => {
    if (!challenges)
      return;
    const ids = new Set(challenges.map(c => c._id as string));
    if (knownIdsRef.current === null) {
      knownIdsRef.current = ids; // first load → silent init
      return;
    }
    const newOnes = challenges.filter(c => !knownIdsRef.current!.has(c._id as string));
    if (newOnes.length > 0)
      setQueue(prev => [...prev, ...newOnes]);
    knownIdsRef.current = ids;
  }, [challenges]);

  const dismiss = useCallback((id: string) => {
    setQueue(prev => prev.filter(c => (c._id as string) !== id));
  }, []);

  return [queue, dismiss];
}
