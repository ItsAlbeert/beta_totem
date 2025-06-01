
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
  runTransaction,
  getDoc,
  writeBatch,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Participant, Game, Score, GameCategory } from "@/types";

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
  // Also delete associated scores
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
  const q = query(collection(db, GAMES_COLLECTION), orderBy("category"), orderBy("name"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => mapDocToDataWithId<Game>(doc));
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
      ...data,
      recordedAt: (data.recordedAt as Timestamp).toDate().toISOString(), // Convert Timestamp to ISO string
    } as Score;
  });
}

export async function addScore(scoreData: Omit<Score, "id" | "recordedAt"> & { recordedAt: Date }): Promise<Score> {
  const dataToSave = {
    ...scoreData,
    recordedAt: Timestamp.fromDate(scoreData.recordedAt), // Convert Date to Timestamp
  };
  const docRef = await addDoc(collection(db, SCORES_COLLECTION), dataToSave);
  return { 
    id: docRef.id, 
    ...scoreData,
    recordedAt: scoreData.recordedAt.toISOString() // Return with ISO string
  };
}

export async function getRecentScores(count: number): Promise<Score[]> {
    const q = query(collection(db, SCORES_COLLECTION), orderBy("recordedAt", "desc"), limit(count));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
        id: docSnapshot.id,
        ...data,
        recordedAt: (data.recordedAt as Timestamp).toDate().toISOString(),
        } as Score;
    });
}
