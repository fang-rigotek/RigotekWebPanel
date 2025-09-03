// src/runtime/db.ts
import { openDB, IDBPDatabase } from "idb";

interface RwpDB {
  prefs: { key: string; value: unknown };
  states: { key: string; value: unknown };
}

// prefs 表
export const STORE_PREFS = "prefs";
// prefs 表键
export const PREFS_KEY = {
  THEME: "theme",
  LANG: "lang",
};

// states 表
export const STORE_STATES = "states";
// states 表键
export const STATES_KEY = {
  COMPAT: "compat",
  LAST_LOGIN_UID: "last_login_uid",
};

// 用户键
export function userStorageKey(userId: string, baseKey: string) {
  return `${userId}:${baseKey}`;
}

export let db: IDBPDatabase<RwpDB> | null = null;

export async function initDB() {
  try {
    db = await openDB<RwpDB>("rwp-db", 3, { 
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_PREFS)) {
          db.createObjectStore(STORE_PREFS);
        }
        if (!db.objectStoreNames.contains(STORE_STATES)) {
          db.createObjectStore(STORE_STATES);
        }
      },
    });
  } catch (err) {
    console.warn("IndexedDB not available:", err);
    db = null;
  }
}
