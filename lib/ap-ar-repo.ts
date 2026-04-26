import type { APARItem } from "./ap-ar-types";
import { getIDB } from "./idb";

export async function getAllAPARItems(): Promise<APARItem[]> {
  const db = await getIDB();
  return db.getAll("ap_ar_items");
}

export async function replaceAllAPARItems(items: APARItem[]): Promise<void> {
  const db = await getIDB();
  const tx = db.transaction("ap_ar_items", "readwrite");
  await tx.store.clear();
  await Promise.all(items.map((item) => tx.store.put(item)));
  await tx.done;
}
