export type Role = "resident" | "moderator" | "admin" | "guest"

export type BulletinStatus = "published" | "pending" | "rejected"

export interface BulletinComment {
  id: string
  author: string
  role: Role
  message: string
  createdAt: string
  flagged: boolean
  matches: string[]
  status: BulletinStatus
}

export interface BulletinPost {
  id: string
  title: string
  author: string
  role: Role
  message: string
  createdAt: string
  status: BulletinStatus
  flagged: boolean
  matches: string[]
  comments: BulletinComment[]
}

export type ModerationAction = "approve" | "reject"

export interface ModerationLogEntry {
  id: string
  targetId: string
  targetType: "post" | "comment"
  action: ModerationAction
  moderator: string
  moderatorRole: Role
  timestamp: string
  notes?: string
}

export interface SurveyOption {
  id: string
  label: string
  description?: string
  votes: number
}

export interface SurveyDefinition {
  question: string
  closingNote: string
  options: SurveyOption[]
}
