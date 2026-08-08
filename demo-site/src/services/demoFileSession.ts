/**
 * IndexedDB persistence for the public demo file session.
 * Kept local because @orkg/scidquest@1.2.0 does not export these helpers yet.
 */
import type { UploadedFile } from '@orkg/scidquest';

const DEFAULT_DB_NAME = 'scidquest-demo';
const DB_VERSION = 1;
const META_STORE = 'meta';
const BLOB_STORE = 'blobs';
const META_KEY = 'current';

export interface FileSessionSnapshot {
  templateId: string;
  activeFileId: string | null;
  files: UploadedFile[];
}

export interface FileSessionOptions {
  dbName?: string;
}

interface PersistedFileMeta {
  id: string;
  name: string;
  size: number;
  mimeType?: string;
  category: UploadedFile['category'];
  addedAt: number;
  externalUrl?: string;
  hasBlob: boolean;
}

interface PersistedMeta {
  templateId: string;
  activeFileId: string | null;
  files: PersistedFileMeta[];
  savedAt: number;
}

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined';
}

function resolveDbName(options?: FileSessionOptions): string {
  return options?.dbName?.trim() || DEFAULT_DB_NAME;
}

function openDb(dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open session DB'));
  });
}

function idbReq<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

async function resolveBlob(file: UploadedFile): Promise<Blob | null> {
  if (file.category === 'repo-link') return null;

  if (file.url.startsWith('blob:')) {
    try {
      const resp = await fetch(file.url);
      if (!resp.ok) return null;
      return await resp.blob();
    } catch {
      return null;
    }
  }

  if (file.url.startsWith('http://') || file.url.startsWith('https://')) {
    try {
      const resp = await fetch(file.url);
      if (!resp.ok) return null;
      return await resp.blob();
    } catch {
      return null;
    }
  }

  return null;
}

export async function saveFileSession(
  snapshot: FileSessionSnapshot,
  options?: FileSessionOptions,
): Promise<void> {
  if (!canUseIndexedDb()) return;
  if (snapshot.files.length === 0) return;

  const metas: PersistedFileMeta[] = [];
  const blobs = new Map<string, Blob>();

  for (const file of snapshot.files) {
    if (file.category === 'repo-link' || !file.url.startsWith('blob:')) {
      metas.push({
        id: file.id,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        category: file.category,
        addedAt: file.addedAt,
        externalUrl: file.url.startsWith('blob:') ? undefined : file.url,
        hasBlob: false,
      });
      continue;
    }

    const blob = await resolveBlob(file);
    if (!blob) {
      metas.push({
        id: file.id,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        category: file.category,
        addedAt: file.addedAt,
        hasBlob: true,
      });
      continue;
    }

    metas.push({
      id: file.id,
      name: file.name,
      size: file.size || blob.size || 0,
      mimeType: file.mimeType || blob.type || undefined,
      category: file.category,
      addedAt: file.addedAt,
      hasBlob: true,
    });
    blobs.set(file.id, blob);
  }

  const payload: PersistedMeta = {
    templateId: snapshot.templateId,
    activeFileId: snapshot.activeFileId,
    files: metas,
    savedAt: Date.now(),
  };

  const dbName = resolveDbName(options);
  const db = await openDb(dbName);
  try {
    const readTx = db.transaction(META_STORE, 'readonly');
    const previous = (await idbReq<PersistedMeta | undefined>(
      readTx.objectStore(META_STORE).get(META_KEY),
    )) as PersistedMeta | undefined;
    await txDone(readTx).catch(() => undefined);

    const previousIds = new Set((previous?.files ?? []).map((f) => f.id));
    const nextIds = new Set(metas.map((f) => f.id));
    const removedIds = [...previousIds].filter((id) => !nextIds.has(id));

    const writeTx = db.transaction([META_STORE, BLOB_STORE], 'readwrite');
    const metaStore = writeTx.objectStore(META_STORE);
    const blobStore = writeTx.objectStore(BLOB_STORE);

    for (const id of removedIds) {
      blobStore.delete(id);
    }
    for (const [id, blob] of blobs) {
      blobStore.put(blob, id);
    }
    metaStore.put(payload, META_KEY);

    await txDone(writeTx);
  } finally {
    db.close();
  }
}

export async function loadFileSession(
  options?: FileSessionOptions,
): Promise<FileSessionSnapshot | null> {
  if (!canUseIndexedDb()) return null;

  const db = await openDb(resolveDbName(options));
  try {
    const metaTx = db.transaction(META_STORE, 'readonly');
    const meta = (await idbReq<PersistedMeta | undefined>(
      metaTx.objectStore(META_STORE).get(META_KEY),
    )) as PersistedMeta | undefined;
    await txDone(metaTx).catch(() => undefined);

    if (!meta || meta.files.length === 0) return null;

    const files: UploadedFile[] = [];
    for (const entry of meta.files) {
      if (!entry.hasBlob) {
        files.push({
          id: entry.id,
          name: entry.name,
          size: entry.size,
          url: entry.externalUrl || '',
          category: entry.category,
          mimeType: entry.mimeType,
          extractionStatus: 'idle',
          addedAt: entry.addedAt,
        });
        continue;
      }

      const blobTx = db.transaction(BLOB_STORE, 'readonly');
      const blob = (await idbReq<Blob | undefined>(
        blobTx.objectStore(BLOB_STORE).get(entry.id),
      )) as Blob | undefined;
      await txDone(blobTx).catch(() => undefined);

      if (!blob) continue;

      const file = new File([blob], entry.name, {
        type: entry.mimeType || blob.type || '',
      });
      const url = URL.createObjectURL(file);

      files.push({
        id: entry.id,
        name: entry.name,
        size: entry.size || file.size,
        url,
        category: entry.category,
        mimeType: entry.mimeType || file.type || undefined,
        extractionStatus: 'idle',
        addedAt: entry.addedAt,
      });
    }

    if (files.length === 0) return null;

    const activeFileId =
      meta.activeFileId && files.some((f) => f.id === meta.activeFileId)
        ? meta.activeFileId
        : files[0].id;

    return {
      templateId: meta.templateId,
      activeFileId,
      files,
    };
  } finally {
    db.close();
  }
}
