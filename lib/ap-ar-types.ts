export type ItemType   = "ap" | "ar";
export type ItemStatus = "pending" | "overdue" | "settled";
export type BU         = "awq" | "jacqes" | "caza" | "venture" | "advisor";

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
