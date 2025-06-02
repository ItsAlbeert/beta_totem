
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
} from "firebase/firestore";
import { db } from "./firebase";
import type { Participant, Game, Score, ExtraGameStatusDetail, GameCategory, ExtraGameType } from "@/types";

// --- Helper to convert Firestore doc to actual data with ID ---
function mapDocToDataWithId<T>(docSnap: QueryDocumentSnapshot<DocumentData>): T {
  return { id: docSnap.id, ...docSnap.data() } as T;
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
  const q = query(collection(db, GAMES_COLLECTION)); // Simplified query, client-side sort for complex criteria
  const snapshot = await getDocs(q);
  const gamesList = snapshot.docs.map(docSnap => {
    const gameData = mapDocToDataWithId<Game>(docSnap);
    if (gameData.category === 'Extra' && !gameData.extraType) {
      gameData.extraType = 'opcional'; // Default for older data
    }
    return gameData;
  });

  // Client-side sorting
  return gamesList.sort((a, b) => {
    const categoryOrder: Record<GameCategory, number> = { 'Physical': 1, 'Mental': 2, 'Extra': 3 };
    if (categoryOrder[a.category] !== categoryOrder[b.category]) {
      return categoryOrder[a.category] - categoryOrder[b.category];
    }
    if (a.category === 'Extra' && b.category === 'Extra') {
      const extraTypeOrder: Record<ExtraGameType, number> = { 'obligatoria': 1, 'opcional': 2 };
      // Ensure extraType is defined before accessing, default to 'opcional' if necessary
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
    gameData.extraType = 'opcional'; // Default if not provided
  }
  const docRef = await addDoc(collection(db, GAMES_COLLECTION), gameData);
  return { id: docRef.id, ...gameData } as Game;
}

export async function updateGame(gameId: string, gameData: Partial<Omit<Game, "id">>): Promise<void> {
  if (gameData.category === 'Extra' && !gameData.extraType) {
    gameData.extraType = 'opcional';
  } else if (gameData.category !== 'Extra' && gameData.hasOwnProperty('extraType')) {
    // Remove extraType if category is not 'Extra'
    const { extraType, ...restOfGameData } = gameData;
    gameData = restOfGameData;
  }
  const gameRef = doc(db, GAMES_COLLECTION, gameId);
  await updateDoc(gameRef, gameData);
}

export async function deleteGame(gameId: string): Promise<void> {
  await deleteDoc(doc(db, GAMES_COLLECTION, gameId));
}

// --- Scores ---
const SCORES_COLLECTION = "scores";

export async function getScores(): Promise<Score[]> {
  const q = query(collection(db, SCORES_COLLECTION), orderBy("recordedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(docSnapshot => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      participantId: data.participantId,
      tiempo_fisico: data.tiempo_fisico ?? 0,
      tiempo_mental: data.tiempo_mental ?? 0,
      extraGameDetailedStatuses: data.extraGameDetailedStatuses || {}, // Default to empty object
      gameTimes: data.gameTimes || {}, // Default to empty object
      recordedAt: (data.recordedAt as Timestamp).toDate().toISOString(),
    } as Score;
  });
}

type AppScoreData = {
  participantId: string;
  tiempo_fisico: number;
  tiempo_mental: number;
  extraGameDetailedStatuses?: { [gameId: string]: ExtraGameStatusDetail };
  gameTimes?: { [gameId: string]: number };
  recordedAt: Date;
};

type FirestoreScoreData = Omit<AppScoreData, 'recordedAt' | 'extraGameDetailedStatuses'> & { 
  recordedAt: Timestamp;
  extraGameDetailedStatuses?: { [gameId: string]: ExtraGameStatusDetail };
};

export async function addScore(
  scoreData: AppScoreData
): Promise<Score> { // Return type Score includes calculated fields, but this func only saves raw

  const dataToSave: FirestoreScoreData = {
    participantId: scoreData.participantId,
    tiempo_fisico: scoreData.tiempo_fisico,
    tiempo_mental: scoreData.tiempo_mental,
    extraGameDetailedStatuses: scoreData.extraGameDetailedStatuses || {},
    gameTimes: scoreData.gameTimes || {},
    recordedAt: Timestamp.fromDate(scoreData.recordedAt),
  };

  const docRef = await addDoc(collection(db, SCORES_COLLECTION), dataToSave);

  // Return a structure that matches Score type as much as possible, 
  // acknowledging calculated fields are done elsewhere.
  return {
    id: docRef.id,
    participantId: scoreData.participantId,
    tiempo_fisico: scoreData.tiempo_fisico,
    tiempo_mental: scoreData.tiempo_mental,
    extraGameDetailedStatuses: scoreData.extraGameDetailedStatuses || {},
    gameTimes: scoreData.gameTimes || {},
    recordedAt: scoreData.recordedAt.toISOString()
    // Puntos fields (puntos_fisico, etc.) are not part of the raw saved data.
  };
}

export async function getRecentScores(count: number): Promise<Score[]> {
    const q = query(collection(db, SCORES_COLLECTION), orderBy("recordedAt", "desc"), limit(count));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
          participantId: data.participantId,
          tiempo_fisico: data.tiempo_fisico ?? 0,
          tiempo_mental: data.tiempo_mental ?? 0,
          extraGameDetailedStatuses: data.extraGameDetailedStatuses || {},
          gameTimes: data.gameTimes || {},
          recordedAt: (data.recordedAt as Timestamp).toDate().toISOString(),
        } as Score;
    });
}
