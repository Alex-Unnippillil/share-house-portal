export const CHORE_CADENCES = [
  "daily",
  "weekly",
  "biweekly",
  "monthly",
  "seasonal",
  "as_needed",
] as const;

export type ChoreCadence = (typeof CHORE_CADENCES)[number];

export type ChoreTemplateFormValues = {
  title: string;
  cadence: ChoreCadence;
  point_value: number;
  requires_proof: boolean;
};

export const CHORE_CADENCE_LABELS: Record<ChoreCadence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 Weeks",
  monthly: "Monthly",
  seasonal: "Seasonal",
  as_needed: "As Needed",
};
