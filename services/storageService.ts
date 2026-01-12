
import { PatientProfile, ProcessedDocument, ReportData } from "../types";

const DB_NAME = 'MediChronicleDB_v3';
const DB_VERSION = 3; 
const STORE_DOCS = 'documents';
const STORE_REPORTS = 'reports';
const STORE_PROFILES = 'profiles';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_DOCS)) {
        db.createObjectStore(STORE_DOCS, { keyPath: ['profileId', 'id'] });
      }
      if (!db.objectStoreNames.contains(STORE_REPORTS)) {
        db.createObjectStore(STORE_REPORTS, { keyPath: 'profileId' });
      }
      if (!db.objectStoreNames.contains(STORE_PROFILES)) {
        db.createObjectStore(STORE_PROFILES, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveProfile = async (profile: PatientProfile): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORE_PROFILES, 'readwrite');
  tx.objectStore(STORE_PROFILES).put(profile);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getAllProfiles = async (): Promise<PatientProfile[]> => {
  const db = await openDB();
  const tx = db.transaction(STORE_PROFILES, 'readonly');
  const request = tx.objectStore(STORE_PROFILES).getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const saveDocumentsToStorage = async (profileId: string, docs: ProcessedDocument[]): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORE_DOCS, 'readwrite');
  const store = tx.objectStore(STORE_DOCS);

  // We don't clear all, only for this profile if needed, 
  // but usually we just overwrite or add.
  for (const doc of docs) {
    const { previewUrl, ...docToSave } = doc;
    store.put({ ...docToSave, profileId });
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const loadDocumentsFromStorage = async (profileId: string): Promise<ProcessedDocument[]> => {
  const db = await openDB();
  const tx = db.transaction(STORE_DOCS, 'readonly');
  const store = tx.objectStore(STORE_DOCS);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const allDocs = request.result as any[];
      const filtered = allDocs.filter(d => d.profileId === profileId);
      const processed = filtered.map(doc => ({
        ...doc,
        previewUrl: doc.file ? URL.createObjectURL(doc.file) : ''
      })) as ProcessedDocument[];
      resolve(processed);
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveReportToStorage = async (profileId: string, report: ReportData): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORE_REPORTS, 'readwrite');
  const store = tx.objectStore(STORE_REPORTS);
  store.put({ ...report, profileId });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const loadReportFromStorage = async (profileId: string): Promise<ReportData | null> => {
  const db = await openDB();
  const tx = db.transaction(STORE_REPORTS, 'readonly');
  const store = tx.objectStore(STORE_REPORTS);
  const request = store.get(profileId);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

export const removeDocumentFromStorage = async (profileId: string, id: string): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORE_DOCS, 'readwrite');
  const store = tx.objectStore(STORE_DOCS);
  store.delete([profileId, id]);
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const clearCurrentPatientData = async (profileId: string): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction([STORE_DOCS, STORE_REPORTS], 'readwrite');
  
  // Custom cleanup for this profile's docs
  const docStore = tx.objectStore(STORE_DOCS);
  const req = docStore.getAll();
  req.onsuccess = () => {
    const docs = req.result;
    docs.forEach((d: any) => {
        if (d.profileId === profileId) docStore.delete([profileId, d.id]);
    });
  };

  tx.objectStore(STORE_REPORTS).delete(profileId);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const deleteProfileCompletely = async (profileId: string): Promise<void> => {
    const db = await openDB();
    await clearCurrentPatientData(profileId);
    const tx = db.transaction(STORE_PROFILES, 'readwrite');
    tx.objectStore(STORE_PROFILES).delete(profileId);
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
