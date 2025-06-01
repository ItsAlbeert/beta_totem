
// src/lib/storage.ts
// This file is now deprecated for storing main application data (participants, scores, games)
// as Firestore is used. It can be kept for other client-side only, non-persistent storage needs,
// or removed if no longer used.

'use client';

// Example: Storing a user preference (not main app data)
export const THEME_PREFERENCE_KEY = "chronoScoreThemePreference";

export const getClientSidePreference = (key: string, defaultValue: string | null = null): string | null => {
  if (typeof window === 'undefined') {
    return defaultValue;
  }
  return localStorage.getItem(key) || defaultValue;
};

export const setClientSidePreference = (key: string, value: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(key, value);
};

// Original functions are no longer needed for main data.
// export const PARTICIPANTS_STORAGE_KEY = "chronoScoreParticipants";
// export const SCORES_STORAGE_KEY = "chronoScoreScores";
// export const GAMES_STORAGE_KEY = "chronoScoreGames";

// export const getStoredData = <T,>(key: string, defaultValue: T[] = []): T[] => {
//   if (typeof window === 'undefined') {
//     return defaultValue;
//   }
//   const stored = localStorage.getItem(key);
//   try {
//     return stored ? JSON.parse(stored) as T[] : defaultValue;
//   } catch (e) {
//     console.error(`Failed to parse ${key} from localStorage`, e);
//     localStorage.removeItem(key); 
//     return defaultValue;
//   }
// };

// export const storeData = <T>(key: string, data: T[]): void => {
//   if (typeof window === 'undefined') {
//     return;
//   }
//   localStorage.setItem(key, JSON.stringify(data));
// };
