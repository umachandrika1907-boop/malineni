import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

export interface CloudIntervention {
  id?: string;
  student_id_str: string;
  student_name: string;
  type: 'ACADEMIC_TUTORING' | 'ATTENDANCE_WARNING' | 'MENTAL_HEALTH' | 'CAREER_COUNSELING' | 'FINANCIAL_AID' | string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  notes: string;
  action_plan?: string;
  assigned_to?: string;
  created_at: string;
}

export interface AiConsultationRecord {
  id?: string;
  topic: string;
  question: string;
  answer: string;
  model: string;
  timestamp: string;
}

// Fallback seed items for demo when Firestore collection is freshly created
const SEED_INTERVENTIONS: CloudIntervention[] = [
  {
    id: 'seed-1',
    student_id_str: '24CS001',
    student_name: 'Aarav Sharma',
    type: 'ATTENDANCE_WARNING',
    severity: 'HIGH',
    status: 'IN_PROGRESS',
    notes: 'Attendance dropped to 68%. Scheduled weekly advisor check-in and morning peer study cohort.',
    action_plan: 'Review attendance logs every Monday and set up SMS notification alerts.',
    assigned_to: 'Dr. Sarah Jenkins (Counselor)',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'seed-2',
    student_id_str: '24CS002',
    student_name: 'Priya Nair',
    type: 'ACADEMIC_TUTORING',
    severity: 'MEDIUM',
    status: 'OPEN',
    notes: 'Requested advanced tutoring in Data Structures & Discrete Math prior to midterm examinations.',
    action_plan: 'Assigned 2 hours/week peer tutoring with Senior Scholar.',
    assigned_to: 'Prof. Rajesh Kumar (Faculty Advisor)',
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
];

/**
 * Fetch all interventions from Cloud Firestore, with graceful local fallback.
 */
export async function getCloudInterventions(): Promise<CloudIntervention[]> {
  try {
    const colRef = collection(db, 'interventions');
    const q = query(colRef, orderBy('created_at', 'desc'), limit(50));
    const snap = await getDocs(q);

    if (snap.empty) {
      // First run: return initial seeds
      return SEED_INTERVENTIONS;
    }

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<CloudIntervention, 'id'>),
    }));
  } catch (err) {
    console.warn('Firestore interventions read failed (using local cache):', err);
    return SEED_INTERVENTIONS;
  }
}

/**
 * Create a new intervention document in Cloud Firestore.
 */
export async function createCloudIntervention(
  data: Omit<CloudIntervention, 'id' | 'created_at'>
): Promise<CloudIntervention> {
  const newRecord: CloudIntervention = {
    ...data,
    created_at: new Date().toISOString(),
  };

  try {
    const colRef = collection(db, 'interventions');
    const docRef = await addDoc(colRef, {
      ...newRecord,
      server_created: serverTimestamp(),
    });
    return { ...newRecord, id: docRef.id };
  } catch (err) {
    console.warn('Firestore write failed, returned local record:', err);
    return { ...newRecord, id: `local-${Date.now()}` };
  }
}

/**
 * Update an existing intervention status.
 */
export async function updateCloudInterventionStatus(
  id: string,
  newStatus: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'
): Promise<boolean> {
  try {
    if (id.startsWith('seed-') || id.startsWith('local-')) {
      return true;
    }
    const docRef = doc(db, 'interventions', id);
    await updateDoc(docRef, { status: newStatus, updated_at: new Date().toISOString() });
    return true;
  } catch (err) {
    console.warn('Firestore status update failed:', err);
    return false;
  }
}

/**
 * Save an AI consultation to Cloud Firestore for session history and audit logs.
 */
export async function saveAiConsultationToFirestore(
  question: string,
  answer: string,
  topic: string,
  model: string
): Promise<void> {
  try {
    const colRef = collection(db, 'ai_consultations');
    await addDoc(colRef, {
      question,
      answer,
      topic,
      model,
      timestamp: new Date().toISOString(),
      created_at: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Could not save AI consultation to Firestore:', err);
  }
}

/**
 * Fetch recent AI consultations from Cloud Firestore.
 */
export async function getRecentAiConsultations(): Promise<AiConsultationRecord[]> {
  try {
    const colRef = collection(db, 'ai_consultations');
    const q = query(colRef, orderBy('timestamp', 'desc'), limit(10));
    const snap = await getDocs(q);

    return snap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<AiConsultationRecord, 'id'>),
    }));
  } catch (err) {
    console.warn('Could not read recent AI consultations from Firestore:', err);
    return [];
  }
}

/**
 * Subscribe to real-time intervention updates across devices.
 */
export function subscribeToInterventions(callback: (items: CloudIntervention[]) => void): () => void {
  try {
    const colRef = collection(db, 'interventions');
    const q = query(colRef, orderBy('created_at', 'desc'), limit(30));

    return onSnapshot(
      q,
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<CloudIntervention, 'id'>),
          }));
          callback(items);
        } else {
          callback(SEED_INTERVENTIONS);
        }
      },
      (err) => {
        console.warn('Firestore real-time subscription error:', err);
        callback(SEED_INTERVENTIONS);
      }
    );
  } catch (err) {
    console.warn('Real-time listener setup failed:', err);
    callback(SEED_INTERVENTIONS);
    return () => {};
  }
}

/**
 * Test Firestore Cloud connection and return latency / status.
 */
export async function testFirestoreConnection(): Promise<{
  connected: boolean;
  latencyMs: number;
  message: string;
}> {
  const start = performance.now();
  try {
    const colRef = collection(db, 'system_health');
    await getDocs(query(colRef, limit(1)));
    const latencyMs = Math.round(performance.now() - start);
    return {
      connected: true,
      latencyMs,
      message: `Cloud Firestore connection active (${latencyMs}ms)`,
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const msg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      latencyMs,
      message: `Firestore offline: ${msg}`,
    };
  }
}
