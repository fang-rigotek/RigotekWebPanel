// src/core/db.ts
import { openDB, IDBPDatabase, DBSchema } from "idb";

interface RwpDB {
  prefs:  { key: string; value: unknown };
  context: { key: string; value: unknown };
  user:  { key: string; value: unknown };
}

export const CONTEXT_STORE = {
  NAME: "context",
  KEY: {
    COMPAT: "compat",
    LAST_LOGIN_UID: "last_login_uid",
    
    DEVICE_ID: "device_id",
    DEVICE_TOKEN: "device_token",
    DEVICE_SEED: "device_seed",

    SERVER_PUBKEY: "server_pubkey",
  },
} as const;

export const PREFS_STORE = {
  NAME: "prefs",
  KEY: {
    THEME: "theme",
    LANG: "lang",
  },
} as const;

export const USER_STORE = {
  NAME: "user",
  KEY: {
    USERNAME: "username",
    USER_TOKEN: "token",
  },
} as const;


export function genUserKey(uid: string, key: string) {
  return `${uid}:${key}`;
}

export let db: IDBPDatabase<RwpDB> | null = null;

export async function initDB() {
  try {
    db = await openDB<RwpDB>("rwp-db", 1, {
      upgrade(u) {
        if (!u.objectStoreNames.contains(PREFS_STORE.NAME))  u.createObjectStore(PREFS_STORE.NAME);
        if (!u.objectStoreNames.contains(CONTEXT_STORE.NAME)) u.createObjectStore(CONTEXT_STORE.NAME);
        if (!u.objectStoreNames.contains(USER_STORE.NAME))  u.createObjectStore(USER_STORE.NAME);
      },
    });
  } catch (err) {
    console.error("IndexedDB init failed:", err);
    db = null;
  }
}
