
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
} from "firebase/firestore";
import { db } from "./firebase";
import type { Participant, Game, Score, ExtraChallengeStatus } from "@/types";

// --- Helper to convert Firestore doc to actual data with ID ---
function mapDocToDataWithId<T>(doc: QueryDocumentSnapshot<DocumentData>): T {
  return { id: doc.id, ...doc.data() } as T;
}

// --- Participants ---
const PARTICIPANTS_COLLECTION = "participants";

export async function getParticipants(): Promise<Participant[]> {
  const q = query(collection(db, PARTICIPANTS_COLLECTION), orderBy("name"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => mapDocToDataWithId<Participant>(doc));
}

export async function addParticipant(participantData: Omit<Participant, "id">): Promise<Participant> {
  const docRef = await addDoc(collection(db, PARTICIPANTS_COLLECTION), participantData);
  return { id: docRef.id, ...participantData };
}

export async function deleteParticipant(participantId: string): Promise<void> {
  const scoresQuery = query(collection(db, SCORES_COLLECTION), where("participantId", "==", participantId));
  const scoresSnapshot = await getDocs(scoresQuery);
  
  const batch = writeBatch(db);
  scoresSnapshot.forEach(doc => {
    batch.delete(doc.ref);
  });
  batch.delete(doc(db, PARTICIPIPANTS_COLLECTION, participantId));
  
  await batch.commit();
}

// --- Games ---
const GAMES_COLLECTION = "games";

export async function getGames(): Promise<Game[]> {
  const q = query(collection(db, GAMES_COLLECTION), orderBy("name")); // Simple sort by name
  const snapshot = await getDocs(q);
  const gamesList = snapshot.docs.map(doc => mapDocToDataWithId<Game>(doc));

  // Client-side sort for category priority then name
  return gamesList.sort((a, b) => {
    const categoryOrder: Record<Game['category'], number> = { 'Physical': 1, 'Mental': 2, 'Extra': 3 };
    if (categoryOrder[a.category] < categoryOrder[b.category]) return -1;
    if (categoryOrder[a.category] > categoryOrder[b.category]) return 1;
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
}

export async function addGame(gameData: Omit<Game, "id">): Promise<Game> {
  const docRef = await addDoc(collection(db, GAMES_COLLECTION), gameData);
  return { id: docRef.id, ...gameData };
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
      extraGameStatuses: data.extraGameStatuses, // May be undefined for old scores
      gameTimes: data.gameTimes,
      recordedAt: (data.recordedAt as Timestamp).toDate().toISOString(),
    } as Score;
  });
}

type NewScoreFirestoreData = {
  participantId: string;
  tiempo_fisico: number;
  tiempo_mental: number;
  extraGameStatuses?: { [gameId: string]: ExtraChallengeStatus };
  gameTimes?: { [gameId: string]: number };
  recordedAt: Timestamp;
};

// Type for data coming from the form/app logic
type AppScoreData = {
  participantId: string;
  tiempo_fisico: number;
  tiempo_mental: number;
  extraGameStatuses?: { [gameId: string]: ExtraChallengeStatus };
  gameTimes?: { [gameId: string]: number };
  recordedAt: Date; // From the app, it's a Date object
};


export async function addScore(
  scoreData: AppScoreData
): Promise<Score> { 
  
  const dataToSave: NewScoreFirestoreData = {
    participantId: scoreData.participantId,
    tiempo_fisico: scoreData.tiempo_fisico,
    tiempo_mental: scoreData.tiempo_mental,
    extraGameStatuses: scoreData.extraGameStatuses,
    gameTimes: scoreData.gameTimes,
    recordedAt: Timestamp.fromDate(scoreData.recordedAt),
  };

  const docRef = await addDoc(collection(db, SCORES_COLLECTION), dataToSave);
  
  return { 
    id: docRef.id, 
    participantId: scoreData.participantId,
    tiempo_fisico: scoreData.tiempo_fisico,
    tiempo_mental: scoreData.tiempo_mental,
    extraGameStatuses: scoreData.extraGameStatuses,
    gameTimes: scoreData.gameTimes,
    recordedAt: scoreData.recordedAt.toISOString()
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
          extraGameStatuses: data.extraGameStatuses,
          gameTimes: data.gameTimes,
          recordedAt: (data.recordedAt as Timestamp).toDate().toISOString(),
        } as Score;
    });
}
