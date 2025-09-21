import type { Role } from "./types"

export type Permission =
  | "createPost"
  | "comment"
  | "moderate"
  | "participateSurvey"
  | "toggleLobby"

const rolePermissions: Record<Role, Set<Permission>> = {
  resident: new Set<Permission>([
    "createPost",
    "comment",
    "participateSurvey",
    "toggleLobby",
  ]),
  moderator: new Set<Permission>([
    "createPost",
    "comment",
    "participateSurvey",
    "moderate",
    "toggleLobby",
  ]),
  admin: new Set<Permission>([
    "createPost",
    "comment",
    "participateSurvey",
    "moderate",
    "toggleLobby",
  ]),
  guest: new Set<Permission>(["toggleLobby"]),
}

export const roleDetails: Record<
  Role,
  { label: string; summary: string; defaultAuthor: string }
> = {
  resident: {
    label: "Resident",
    summary: "Residents can share updates, comment on posts, and participate in surveys.",
    defaultAuthor: "Resident",
  },
  moderator: {
    label: "Community Moderator",
    summary:
      "Moderators review flagged content and keep the bulletin board collaborative and safe.",
    defaultAuthor: "Moderator",
  },
  admin: {
    label: "Building Admin",
    summary:
      "Admins can manage all content streams and ensure community guidelines are followed.",
    defaultAuthor: "Building Admin",
  },
  guest: {
    label: "Guest Viewer",
    summary:
      "Guests can only view the lobby display without contributing content.",
    defaultAuthor: "Guest",
  },
}

export const can = (role: Role, permission: Permission) =>
  rolePermissions[role]?.has(permission) ?? false
