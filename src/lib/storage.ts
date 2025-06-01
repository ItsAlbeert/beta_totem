
// src/lib/storage.ts
'use client';

export const PARTICIPANTS_STORAGE_KEY = "chronoScoreParticipants";
export const SCORES_STORAGE_KEY = "chronoScoreScores";
export const GAMES_STORAGE_KEY = "chronoScoreGames";

export const getStoredData = <T,>(key: string, defaultValue: T[] = []): T[] => {
  if (typeof window === 'undefined') {
    // console.warn(`localStorage unavailable on server, returning default for ${key}`);
    return defaultValue;
  }
  const stored = localStorage.getItem(key);
  try {
    return stored ? JSON.parse(stored) as T[] : defaultValue;
  } catch (e) {
    console.error(`Failed to parse ${key} from localStorage`, e);
    localStorage.removeItem(key); // Clear corrupted data
    return defaultValue;
  }
};

export const storeData = <T>(key: string, data: T[]): void => {
  if (typeof window === 'undefined') {
    // console.warn(`localStorage unavailable on server, cannot store ${key}`);
    return;
  }
  localStorage.setItem(key, JSON.stringify(data));
};
