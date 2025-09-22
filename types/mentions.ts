export interface MentionDirectoryEntry {
  id: string
  handle: string
  name: string
  role?: string
}

export interface MentionSuggestion extends MentionDirectoryEntry {
  score: number
}

export type MentionsWorkerRequest =
  | { type: "init"; payload: MentionDirectoryEntry[] }
  | { type: "search"; payload: { id: number; query: string } }

export type MentionsWorkerResponse =
  | { type: "results"; payload: { id: number; query: string; results: MentionSuggestion[]; duration: number } }
