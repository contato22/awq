// ─── AWQ Treasury — IndexedDB client ─────────────────────────────────────────
// Thin wrapper around native IDB API via the `idb` library.
// Must only be called client-side (useEffect / event handlers).

import type { IDBPDatabase } from "idb";
import type { Contraparte } from "./contraparte-types";

const DB_NAME    = "awq-treasury";
const DB_VERSION = 1;

let _db: IDBPDatabase<AWQSchema> | null = null;
let _promise: Promise<IDBPDatabase<AWQSchema>> | null = null;

// ─── Schema ───────────────────────────────────────────────────────────────────
import type { DBSchema } from "idb";

interface AWQSchema extends DBSchema {
  contrapartes: {
    key:     string;
    value:   Contraparte;
    indexes: {
      "by-papel":  string;
      "by-bu":     string;
      "by-status": string;
    };
  };
}

export async function getIDB(): Promise<IDBPDatabase<AWQSchema>> {
  if (typeof window === "undefined") throw new Error("IndexedDB not available");
  if (_db) return _db;
  if (_promise) return _promise;

  const { openDB } = await import("idb");

  _promise = openDB<AWQSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains("contrapartes")) {
        const s = db.createObjectStore("contrapartes", { keyPath: "id" });
        s.createIndex("by-papel",  "papel",  { unique: false });
        s.createIndex("by-bu",     "bu",     { unique: false });
        s.createIndex("by-status", "status", { unique: false });
      }
    },
  }).then((db) => {
    _db = db;
    return db;
  });

  return _promise;
}
