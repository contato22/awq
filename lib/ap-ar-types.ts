import type { BU } from "./bu-config";

export type { BU };
export type ItemType   = "ap" | "ar";
export type ItemStatus = "pending" | "overdue" | "settled";

export interface APARItem {
  id:          string;
  type:        ItemType;
  bu:          BU;
  description: string;
  entity:      string;
  amount:      number;
  dueDate:     string;
  status:      ItemStatus;
  category:    string;
  createdAt:   string;
}
