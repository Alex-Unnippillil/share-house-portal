export const PRIORITY_LEVELS = ["urgent", "high", "medium", "low"] as const;

export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const PRIORITY_RANK: Record<PriorityLevel, number> = {
  urgent: 3,
  high: 2,
  medium: 1,
  low: 0,
};
