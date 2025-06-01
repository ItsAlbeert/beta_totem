
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
  batch.delete(doc(db, PARTICIPANTS_COLLECTION, participantId));
  
  await batch.commit();
}

// --- Games ---
const GAMES_COLLECTION = "games";

export async function getGames(): Promise<Game[]> {
  const q = query(collection(db, GAMES_COLLECTION), orderBy("name"));
  const snapshot = await getDocs(q);
  const gamesList = snapshot.docs.map(doc => mapDocToDataWithId<Game>(doc));

  return gamesList.sort((a, b) => {
    if (a.category < b.category) return -1;
    if (a.category > b.category) return 1;
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
    // Ensure all necessary fields are present, providing defaults if some raw scores might be missing them
    return {
      id: docSnapshot.id,
      participantId: data.participantId,
      tiempo_fisico: data.tiempo_fisico ?? 0,
      tiempo_mental: data.tiempo_mental ?? 0,
      estado_extra: data.estado_extra ?? 'no_hecho',
      gameTimes: data.gameTimes, // gameTimes are optional
      recordedAt: (data.recordedAt as Timestamp).toDate().toISOString(),
    } as Score; // Cast, calculated fields will be added by data-utils
  });
}

// Defines the type for data being saved to Firestore for a new score
type NewScoreFirestoreData = {
  participantId: string;
  tiempo_fisico: number;
  tiempo_mental: number;
  estado_extra: ExtraChallengeStatus;
  gameTimes?: { [gameId: string]: number };
  recordedAt: Timestamp; // Firestore expects Timestamp
};

export async function addScore(
  scoreData: Omit<Score, "id" | "recordedAt" | "puntuacion_fisica_normalizada" | "puntuacion_mental_normalizada" | "ajuste_extra_minutos" | "puntuacion_extra_normalizada" | "puntuacion_final_ponderada"> & { recordedAt: Date }
): Promise<Score> { // Returns the Score type which includes optional calculated fields
  
  const dataToSave: NewScoreFirestoreData = {
    participantId: scoreData.participantId,
    tiempo_fisico: scoreData.tiempo_fisico,
    tiempo_mental: scoreData.tiempo_mental,
    estado_extra: scoreData.estado_extra,
    gameTimes: scoreData.gameTimes,
    recordedAt: Timestamp.fromDate(scoreData.recordedAt),
  };

  const docRef = await addDoc(collection(db, SCORES_COLLECTION), dataToSave);
  
  // Return a structure that matches the Score type,
  // calculated fields will be undefined here as they are processed later
  return { 
    id: docRef.id, 
    ...scoreData, // contains participantId, tiempo_fisico, tiempo_mental, estado_extra, gameTimes
    recordedAt: scoreData.recordedAt.toISOString() // Convert Date back to ISO string for consistency in app
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
          estado_extra: data.estado_extra ?? 'no_hecho',
          gameTimes: data.gameTimes,
          recordedAt: (data.recordedAt as Timestamp).toDate().toISOString(),
        } as Score;
    });
}
