import type { APARItem } from "./ap-ar-types";
import { getIDB } from "./idb";

const STORE = "ap_ar_items" as const;

export async function getAllAPARItems(): Promise<APARItem[]> {
  const db = await getIDB();
  return db.getAll(STORE);
}

export async function replaceAllAPARItems(items: APARItem[]): Promise<void> {
  const db = await getIDB();
  const tx = db.transaction(STORE, "readwrite");
  tx.store.clear();
  items.forEach((item) => tx.store.put(item));
  await tx.done;
}
