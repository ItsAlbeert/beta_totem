
// src/lib/firestore-services.ts
import {
  collection,
  getDocs,
  addDoc,
  doc,
  deleteDoc,
  query,
  where,
  Timestamp,
  orderBy,
  limit,
  writeBatch,
  DocumentData,
  QueryDocumentSnapshot,
  updateDoc,
  getDoc, 
  setDoc, // Added setDoc for settings
} from "firebase/firestore";
import { db } from "./firebase";
import type { Participant, Game, Score, ExtraGameStatusDetail, GameCategory, ExtraGameType, ScoringSettings, LeaderboardEntry } from "@/types";
import { calculateAllParticipantScores } from "./data-utils";

// --- Helper to convert Firestore doc to actual data with ID ---
function mapDocToDataWithId<T>(docSnap: QueryDocumentSnapshot<DocumentData> | DocumentData): T {
  if ('exists' in docSnap && typeof docSnap.exists === 'function' && 'id' in docSnap) {
    return { id: docSnap.id, ...docSnap.data() } as T;
  }
  return docSnap as T;
}


// --- Participants ---
const PARTICIPANTS_COLLECTION = "participants";

export async function getParticipants(): Promise<Participant[]> {
  const q = query(collection(db, PARTICIPANTS_COLLECTION), orderBy("name"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnap => mapDocToDataWithId<Participant>(docSnap));
}

export async function addParticipant(participantData: Omit<Participant, "id">): Promise<Participant> {
  const docRef = await addDoc(collection(db, PARTICIPANTS_COLLECTION), participantData);
  return { id: docRef.id, ...participantData };
}

export async function deleteParticipant(participantId: string): Promise<void> {
  const scoresQuery = query(collection(db, "scores"), where("participantId", "==", participantId));
  const scoresSnapshot = await getDocs(scoresQuery);

  const batch = writeBatch(db);
  scoresSnapshot.forEach(docSnapshot => {
    batch.delete(docSnapshot.ref);
  });
  batch.delete(doc(db, PARTICIPANTS_COLLECTION, participantId));

  await batch.commit();
}

// --- Games ---
const GAMES_COLLECTION = "games";

export async function getGames(): Promise<Game[]> {
  const q = query(collection(db, GAMES_COLLECTION)); 
  const snapshot = await getDocs(q);
  const gamesList = snapshot.docs.map(docSnap => {
    const gameData = mapDocToDataWithId<Game>(docSnap);
    if (gameData.category === 'Extra' && !gameData.extraType) {
      gameData.extraType = 'opcional'; 
    }
    return gameData;
  });

  return gamesList.sort((a, b) => {
    const categoryOrder: Record<GameCategory, number> = { 'Physical': 1, 'Mental': 2, 'Extra': 3 };
    if (categoryOrder[a.category] !== categoryOrder[b.category]) {
      return categoryOrder[a.category] - categoryOrder[b.category];
    }
    if (a.category === 'Extra' && b.category === 'Extra') {
      const extraTypeOrder: Record<ExtraGameType, number> = { 'obligatoria': 1, 'opcional': 2 };
      const aType = a.extraType || 'opcional';
      const bType = b.extraType || 'opcional';
      if (extraTypeOrder[aType] !== extraTypeOrder[bType]) {
        return extraTypeOrder[aType] - extraTypeOrder[bType];
      }
    }
    return a.name.localeCompare(b.name);
  });
}

export async function addGame(gameData: Omit<Game, "id">): Promise<Game> {
  if (gameData.category === 'Extra' && !gameData.extraType) {
    gameData.extraType = 'opcional'; 
  }
  const docRef = await addDoc(collection(db, GAMES_COLLECTION), gameData);
  return { id: docRef.id, ...gameData } as Game;
}

export async function updateGame(gameId: string, gameData: Partial<Omit<Game, "id">>): Promise<void> {
  let dataToUpdate = { ...gameData };
  if (dataToUpdate.category === 'Extra' && !dataToUpdate.extraType) {
    dataToUpdate.extraType = 'opcional';
  } else if (dataToUpdate.category !== 'Extra' && dataToUpdate.hasOwnProperty('extraType')) {
    delete dataToUpdate.extraType;
  }
  const gameRef = doc(db, GAMES_COLLECTION, gameId);
  await updateDoc(gameRef, dataToUpdate);
}

export async function deleteGame(gameId: string): Promise<void> {
  await deleteDoc(doc(db, GAMES_COLLECTION, gameId));
}

// --- Scores ---
const SCORES_COLLECTION = "scores";

export async function getScores(): Promise<Score[]> {
  const q = query(collection(db, SCORES_COLLECTION), orderBy("recordedAt", "desc"));
  const snapshot = await getDocs(q);
  
  const scores: Score[] = [];
  snapshot.forEach(docSnapshot => {
    const data = docSnapshot.data();
    // Safely handle recordedAt
    if (data.recordedAt && data.recordedAt.toDate) {
      scores.push({
        id: docSnapshot.id,
        participantId: data.participantId,
        tiempo_fisico: data.tiempo_fisico ?? 0,
        tiempo_mental: data.tiempo_mental ?? 0,
        extraGameDetailedStatuses: data.extraGameDetailedStatuses || {}, 
        gameTimes: data.gameTimes || {}, 
        recordedAt: data.recordedAt.toDate().toISOString(),
      });
    } else {
        console.warn(`Skipping score with id ${docSnapshot.id} due to invalid 'recordedAt' field.`);
    }
  });
  return scores;
}

export async function getScoreById(scoreId: string): Promise<Score | null> {
  const scoreRef = doc(db, SCORES_COLLECTION, scoreId);
  const docSnap = await getDoc(scoreRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    if (data.recordedAt && data.recordedAt.toDate) {
      return {
        id: docSnap.id,
        participantId: data.participantId,
        tiempo_fisico: data.tiempo_fisico ?? 0,
        tiempo_mental: data.tiempo_mental ?? 0,
        extraGameDetailedStatuses: data.extraGameDetailedStatuses || {},
        gameTimes: data.gameTimes || {},
        recordedAt: data.recordedAt.toDate().toISOString(),
      } as Score;
    } else {
       console.error(`Score with ID ${scoreId} has an invalid 'recordedAt' field.`);
       return null;
    }
  } else {
    console.error(`No score found with ID: ${scoreId}`);
    return null;
  }
}


type AppScoreData = {
  participantId: string;
  tiempo_fisico: number;
  tiempo_mental: number;
  extraGameDetailedStatuses?: { [gameId: string]: ExtraGameStatusDetail };
  gameTimes?: { [gameId: string]: number };
  recordedAt: Date; 
};

type FirestoreScoreData = Omit<AppScoreData, 'recordedAt'> & { 
  recordedAt: Timestamp;
};

export async function addScore(
  scoreData: AppScoreData
): Promise<Score> { 

  const dataToSave: FirestoreScoreData = {
    participantId: scoreData.participantId,
    tiempo_fisico: scoreData.tiempo_fisico,
    tiempo_mental: scoreData.tiempo_mental,
    extraGameDetailedStatuses: scoreData.extraGameDetailedStatuses || {},
    gameTimes: scoreData.gameTimes || {},
    recordedAt: Timestamp.fromDate(scoreData.recordedAt),
  };

  const docRef = await addDoc(collection(db, SCORES_COLLECTION), dataToSave);

  return {
    id: docRef.id,
    participantId: scoreData.participantId,
    tiempo_fisico: scoreData.tiempo_fisico,
    tiempo_mental: scoreData.tiempo_mental,
    extraGameDetailedStatuses: scoreData.extraGameDetailedStatuses || {},
    gameTimes: scoreData.gameTimes || {},
    recordedAt: scoreData.recordedAt.toISOString()
  };
}

type UpdatableScoreData = Pick<Score, 'tiempo_fisico' | 'tiempo_mental' | 'gameTimes' | 'extraGameDetailedStatuses'>;

export async function updateScore(
  scoreId: string,
  dataToUpdate: UpdatableScoreData
): Promise<void> {
  const scoreRef = doc(db, SCORES_COLLECTION, scoreId);
  await updateDoc(scoreRef, {
    tiempo_fisico: dataToUpdate.tiempo_fisico,
    tiempo_mental: dataToUpdate.tiempo_mental,
    gameTimes: dataToUpdate.gameTimes || {},
    extraGameDetailedStatuses: dataToUpdate.extraGameDetailedStatuses || {},
  });
}


export async function getRecentScores(count: number): Promise<Score[]> {
    const q = query(collection(db, SCORES_COLLECTION), orderBy("recordedAt", "desc"), limit(count));
    const snapshot = await getDocs(q);
    const scores: Score[] = [];
    snapshot.forEach(docSnapshot => {
        const data = docSnapshot.data();
        if (data.recordedAt && data.recordedAt.toDate) {
            scores.push({
              id: docSnapshot.id,
              participantId: data.participantId,
              tiempo_fisico: data.tiempo_fisico ?? 0,
              tiempo_mental: data.tiempo_mental ?? 0,
              extraGameDetailedStatuses: data.extraGameDetailedStatuses || {},
              gameTimes: data.gameTimes || {},
              recordedAt: data.recordedAt.toDate().toISOString(),
            });
        } else {
             console.warn(`Skipping recent score with id ${docSnapshot.id} due to invalid 'recordedAt' field.`);
        }
    });
    return scores;
}

// --- Scoring Settings ---
const SETTINGS_COLLECTION = "settings";
const SCORING_RULES_DOC_ID = "scoring_rules";

export const DEFAULT_SCORING_SETTINGS: ScoringSettings = {
  physical: {
    threshold1: 220,
    threshold2: 360,
    maxPoints: 100,
    minPoints: 30,
  },
  mental: {
    threshold1: 50,
    threshold2: 120,
    maxPoints: 100,
    minPoints: 30,
  },
  extras: {
    capMax: 30,
    capMin: -10,
    points: {
      opcional: {
        muy_bien: 10,
        regular: 6,
        no_hecho: 0,
      },
      obligatoria: {
        muy_bien: 10,
        regular: 6,
        no_hecho: -10,
      },
    },
  },
};

export async function getScoringSettings(): Promise<ScoringSettings> {
  const docRef = doc(db, SETTINGS_COLLECTION, SCORING_RULES_DOC_ID);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as ScoringSettings;
  } else {
    // If settings don't exist, create them with default values
    await setDoc(docRef, DEFAULT_SCORING_SETTINGS);
    return { id: SCORING_RULES_DOC_ID, ...DEFAULT_SCORING_SETTINGS };
  }
}

export async function updateScoringSettings(settings: Omit<ScoringSettings, 'id'>): Promise<void> {
  const docRef = doc(db, SETTINGS_COLLECTION, SCORING_RULES_DOC_ID);
  await setDoc(docRef, settings, { merge: true }); // Use setDoc with merge to create or overwrite
}
    
// --- Performance Optimization: Cached Leaderboard Calculation ---

export async function getCalculatedLeaderboardData(): Promise<LeaderboardEntry[]> {
  try {
    const [participants, allScores, games, scoringSettings] = await Promise.all([
      getParticipants(),
      getScores(),
      getGames(),
      getScoringSettings(),
    ]);

    // Handle case where essential data might be missing
    if (!participants || !allScores || !games || !scoringSettings) {
      console.warn("Missing essential data for leaderboard calculation.");
      return [];
    }
    
    // Return empty array if there are no participants or scores to process
    if (participants.length === 0 || allScores.length === 0) {
        return [];
    }

    const leaderboardData = calculateAllParticipantScores(participants, allScores, games, scoringSettings);
    return leaderboardData;
  } catch (error) {
    console.error("Error calculating leaderboard data:", error);
    // Return an empty array or re-throw the error, depending on desired error handling
    return [];
  }
}
