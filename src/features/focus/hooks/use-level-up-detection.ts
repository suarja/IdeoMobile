import type { useUserStats } from '../api';

import { useEffect, useRef, useState } from 'react';

type LevelUpData = {
  newLevel: number;
  newLevelName: string;
  newLevelIcon: string;
};

type UseLevelUpDetectionResult = {
  showModal: boolean;
  levelUpData: LevelUpData | null;
  dismiss: () => void;
};

/**
 * Detects when `currentLevel` increases and returns modal visibility state.
 *
 * Cold-start guard: on first data arrival, sets the baseline without firing
 * the modal — prevents false positives on app launch.
 */
export function useLevelUpDetection(
  stats: ReturnType<typeof useUserStats>,
): UseLevelUpDetectionResult {
  const prevLevelRef = useRef<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null);

  useEffect(() => {
    if (stats === undefined || stats === null)
      return;

    const currentLevel = stats.currentLevel ?? 1;

    // Cold-start guard: set baseline on first data arrival, do not fire modal.
    if (prevLevelRef.current === null) {
      prevLevelRef.current = currentLevel;
      return;
    }

    if (currentLevel > prevLevelRef.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLevelUpData({
        newLevel: currentLevel,
        newLevelName: stats.levelName ?? '',
        newLevelIcon: stats.levelIcon ?? '',
      });

      setShowModal(true);
    }

    prevLevelRef.current = currentLevel;
  }, [stats]);

  const dismiss = () => {
    setShowModal(false);
    setTimeout(() => setLevelUpData(null), 400);
  };

  return { showModal, levelUpData, dismiss };
}
