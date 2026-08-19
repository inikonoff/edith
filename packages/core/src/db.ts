import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { MAX_FILE_SIZE_BYTES } from './constants';
import type { EditorSessionState, PageFileRecord, PageRecord } from './types';

interface EdithDB extends DBSchema {
  pages: {
    key: string;
    value: PageRecord;
  };
  pageFiles: {
    key: string;
    value: PageFileRecord;
    indexes: { byPage: string };
  };
  pageState: {
    key: string;
    value: EditorSessionState;
  };
}

const DB_NAME = 'edith-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<EdithDB>> | undefined;

export function getDb(): Promise<IDBPDatabase<EdithDB>> {
  if (!dbPromise) {
    dbPromise = openDB<EdithDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pages')) {
          db.createObjectStore('pages', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pageFiles')) {
          const store = db.createObjectStore('pageFiles');
          store.createIndex('byPage', 'pageId');
        }
        if (!db.objectStoreNames.contains('pageState')) {
          db.createObjectStore('pageState', { keyPath: 'pageId' });
        }
      },
    });
  }
  return dbPromise;
}

export function pageFileKey(pageId: string, path: string): string {
  return `${pageId}:${path}`;
}

export class FileTooLargeError extends Error {
  constructor(
    public readonly path: string,
    public readonly size: number,
  ) {
    super(`File "${path}" is ${size} bytes, which exceeds the ${MAX_FILE_SIZE_BYTES} byte limit`);
    this.name = 'FileTooLargeError';
  }
}

export async function putPage(page: PageRecord): Promise<void> {
  const db = await getDb();
  await db.put('pages', page);
}

export async function getPage(id: string): Promise<PageRecord | undefined> {
  const db = await getDb();
  return db.get('pages', id);
}

export async function listPages(): Promise<PageRecord[]> {
  const db = await getDb();
  return db.getAll('pages');
}

export async function deletePage(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['pages', 'pageFiles', 'pageState'], 'readwrite');
  const fileKeys = await tx.objectStore('pageFiles').index('byPage').getAllKeys(id);
  await Promise.all([
    tx.objectStore('pages').delete(id),
    tx.objectStore('pageState').delete(id),
    ...fileKeys.map((key) => tx.objectStore('pageFiles').delete(key)),
  ]);
  await tx.done;
}

export async function putPageFile(record: PageFileRecord): Promise<void> {
  if (record.size > MAX_FILE_SIZE_BYTES) {
    throw new FileTooLargeError(record.path, record.size);
  }
  const db = await getDb();
  await db.put('pageFiles', record, pageFileKey(record.pageId, record.path));
}

export async function getPageFile(pageId: string, path: string): Promise<PageFileRecord | undefined> {
  const db = await getDb();
  return db.get('pageFiles', pageFileKey(pageId, path));
}

export async function listPageFiles(pageId: string): Promise<PageFileRecord[]> {
  const db = await getDb();
  return db.getAllFromIndex('pageFiles', 'byPage', pageId);
}

export async function deletePageFile(pageId: string, path: string): Promise<void> {
  const db = await getDb();
  await db.delete('pageFiles', pageFileKey(pageId, path));
}

export async function putPageState(state: EditorSessionState): Promise<void> {
  const db = await getDb();
  await db.put('pageState', state);
}

export async function getPageState(pageId: string): Promise<EditorSessionState | undefined> {
  const db = await getDb();
  return db.get('pageState', pageId);
}
