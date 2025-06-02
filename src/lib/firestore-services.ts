
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
import type { Participant, Game, Score, ExtraChallengeStatus, GameCategory, ExtraGameStatusDetail, ExtraGameType } from "@/types";

// --- Helper to convert Firestore doc to actual data with ID ---
function mapDocToDataWithId<T>(docSnap: QueryDocumentSnapshot<DocumentData>): T { // Renamed doc to docSnap for clarity
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
  const scoresQuery = query(collection(db, "scores"), where("participantId", "==", participantId)); // Used "scores" directly for safety
  const scoresSnapshot = await getDocs(scoresQuery);

  const batch = writeBatch(db);
  scoresSnapshot.forEach(docSnapshot => {
    batch.delete(docSnapshot.ref);
  });
  batch.delete(doc(db, PARTICIPANTS_COLLECTION, participantId)); // Corrected collection name

  await batch.commit();
}

// --- Games ---
const GAMES_COLLECTION = "games";

export async function getGames(): Promise<Game[]> {
  const q = query(collection(db, GAMES_COLLECTION), orderBy("name"));
  const snapshot = await getDocs(q);
  const gamesList = snapshot.docs.map(docSnap => {
    const gameData = mapDocToDataWithId<Game>(docSnap);
    // Ensure extraType has a default if not present for older data
    if (gameData.category === 'Extra' && !gameData.extraType) {
      gameData.extraType = 'opcional'; // Default to 'opcional' or handle as needed
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
      if (extraTypeOrder[a.extraType!] !== extraTypeOrder[b.extraType!]) {
        return extraTypeOrder[a.extraType!] - extraTypeOrder[b.extraType!];
      }
    }
    return a.name.localeCompare(b.name);
  });
}

export async function addGame(gameData: Omit<Game, "id">): Promise<Game> {
  // Ensure extraType is set if category is Extra, default to 'opcional'
  if (gameData.category === 'Extra' && !gameData.extraType) {
    gameData.extraType = 'opcional';
  }
  const docRef = await addDoc(collection(db, GAMES_COLLECTION), gameData);
  return { id: docRef.id, ...gameData } as Game;
}


export async function updateGame(gameId: string, gameData: Partial<Omit<Game, "id">>): Promise<void> {
  const gameRef = doc(db, GAMES_COLLECTION, gameId);
  await updateDoc(gameRef, gameData);
}


export async function deleteGame(gameId: string): Promise<void> {
  // Consider implications: what if scores reference this game?
  // For now, just deleting the game document.
  // Future: Could archive or handle references in scores.
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
      extraGameDetailedStatuses: data.extraGameDetailedStatuses,
      gameTimes: data.gameTimes,
      recordedAt: (data.recordedAt as Timestamp).toDate().toISOString(),
      // Calculated fields (puntos_*) will be added by data-utils, not stored directly
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

type FirestoreScoreData = Omit<AppScoreData, 'recordedAt'> & { recordedAt: Timestamp };

export async function addScore(
  scoreData: AppScoreData
): Promise<Score> {

  const dataToSave: FirestoreScoreData = {
    participantId: scoreData.participantId,
    tiempo_fisico: scoreData.tiempo_fisico,
    tiempo_mental: scoreData.tiempo_mental,
    extraGameDetailedStatuses: scoreData.extraGameDetailedStatuses,
    gameTimes: scoreData.gameTimes,
    recordedAt: Timestamp.fromDate(scoreData.recordedAt),
  };

  const docRef = await addDoc(collection(db, SCORES_COLLECTION), dataToSave);

  return {
    id: docRef.id,
    participantId: scoreData.participantId,
    tiempo_fisico: scoreData.tiempo_fisico,
    tiempo_mental: scoreData.tiempo_mental,
    extraGameDetailedStatuses: scoreData.extraGameDetailedStatuses,
    gameTimes: scoreData.gameTimes,
    recordedAt: scoreData.recordedAt.toISOString()
    // Puntos fields are not returned here, they are calculated on demand
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
          extraGameDetailedStatuses: data.extraGameDetailedStatuses,
          gameTimes: data.gameTimes,
          recordedAt: (data.recordedAt as Timestamp).toDate().toISOString(),
        } as Score;
    });
}
