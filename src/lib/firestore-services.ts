
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
  getDoc, // Added getDoc
} from "firebase/firestore";
import { db } from "./firebase";
import type { Participant, Game, Score, ExtraGameStatusDetail, GameCategory, ExtraGameType } from "@/types";

// --- Helper to convert Firestore doc to actual data with ID ---
function mapDocToDataWithId<T>(docSnap: QueryDocumentSnapshot<DocumentData> | DocumentData): T {
  // Check if it's a QueryDocumentSnapshot by looking for 'exists' and 'id' properties
  if ('exists' in docSnap && typeof docSnap.exists === 'function' && 'id' in docSnap) {
    return { id: docSnap.id, ...docSnap.data() } as T;
  }
  // Fallback for DocumentData if id is already included (e.g. after manual construction)
  // This branch might not be strictly necessary if always using QueryDocumentSnapshot
  // or ensuring id is manually added if using DocumentData directly.
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
  if (gameData.category === 'Extra' && !gameData.extraType) {
    gameData.extraType = 'opcional';
  } else if (gameData.category !== 'Extra' && gameData.hasOwnProperty('extraType')) {
    // @ts-ignore
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
      extraGameDetailedStatuses: data.extraGameDetailedStatuses || {}, 
      gameTimes: data.gameTimes || {}, 
      recordedAt: (data.recordedAt as Timestamp).toDate().toISOString(),
    } as Score;
  });
}

export async function getScoreById(scoreId: string): Promise<Score | null> {
  const scoreRef = doc(db, SCORES_COLLECTION, scoreId);
  const docSnap = await getDoc(scoreRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      participantId: data.participantId,
      tiempo_fisico: data.tiempo_fisico ?? 0,
      tiempo_mental: data.tiempo_mental ?? 0,
      extraGameDetailedStatuses: data.extraGameDetailedStatuses || {},
      gameTimes: data.gameTimes || {},
      recordedAt: (data.recordedAt as Timestamp).toDate().toISOString(),
    } as Score; // Calculated fields like puntos_total are not stored, so they won't be here
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
  recordedAt: Date; // Used for new scores
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

// Data type for updating, typically doesn't include participantId or recordedAt
type UpdatableScoreData = Pick<Score, 'tiempo_fisico' | 'tiempo_mental' | 'gameTimes' | 'extraGameDetailedStatuses'>;

export async function updateScore(
  scoreId: string,
  dataToUpdate: UpdatableScoreData
): Promise<void> {
  const scoreRef = doc(db, SCORES_COLLECTION, scoreId);
  // We don't update recordedAt or participantId when editing a score's content
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

    