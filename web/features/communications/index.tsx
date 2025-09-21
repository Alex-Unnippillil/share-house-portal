"use client"

import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { bannedWords, filterContent } from "./content-filter"
import { can, roleDetails } from "./permissions"
import type {
  BulletinComment,
  BulletinPost,
  BulletinStatus,
  ModerationAction,
  ModerationLogEntry,
  Role,
  SurveyDefinition,
} from "./types"

const generateId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const initialPosts: BulletinPost[] = [
  {
    id: "welcome-post",
    title: "Welcome to the Share House!",
    author: "Community Moderator",
    role: "moderator",
    message:
      "Remember to introduce yourself and share community updates here. Keep the tone friendly and inclusive!",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    status: "published",
    flagged: false,
    matches: [],
    comments: [
      {
        id: "welcome-comment-1",
        author: "Resident",
        role: "resident",
        message: "Excited to meet everyone at the potluck tonight!",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
        status: "published",
        flagged: false,
        matches: [],
      },
    ],
  },
  {
    id: "maintenance-update",
    title: "Maintenance Reminder",
    author: "Building Admin",
    role: "admin",
    message:
      "Routine hallway maintenance happens on Thursday at 10am. Please remove bikes or belongings from shared corridors.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    status: "published",
    flagged: false,
    matches: [],
    comments: [],
  },
]

const surveyDefinition: SurveyDefinition = {
  question: "Which community upgrade should we prioritize next?",
  closingNote: "Voting closes on Friday at 8pm.",
  options: [
    {
      id: "garden",
      label: "Rooftop herb garden",
      description: "Includes shared planters and weekly workshops.",
      votes: 18,
    },
    {
      id: "workspace",
      label: "Quiet co-working nook",
      description: "Sound-dampened booths and upgraded Wi-Fi.",
      votes: 23,
    },
    {
      id: "movie",
      label: "Outdoor movie nights",
      description: "Projector upgrades and seasonal programming.",
      votes: 15,
    },
  ],
}

const formatDate = (isoString: string) =>
  new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString))

const excerpt = (text: string, length = 120) =>
  text.length > length ? `${text.slice(0, length)}…` : text

const defaultCommentDrafts = (posts: BulletinPost[]) =>
  posts.reduce<Record<string, string>>((acc, post) => {
    acc[post.id] = ""
    return acc
  }, {})

const initialSurveyParticipation: Record<Role, boolean> = {
  resident: false,
  moderator: false,
  admin: false,
  guest: false,
}

const statusBadgeVariant = (status: BulletinStatus) => {
  switch (status) {
    case "pending":
      return "secondary" as const
    case "rejected":
      return "destructive" as const
    default:
      return "default" as const
  }
}

const statusLabel = (status: BulletinStatus) => {
  switch (status) {
    case "pending":
      return "Pending review"
    case "rejected":
      return "Rejected"
    default:
      return "Published"
  }
}

const getInitialSurveyOptions = () =>
  surveyDefinition.options.map((option) => ({ ...option }))

const buildLobbyStats = (options: SurveyDefinition["options"]) => {
  const totalVotes = options.reduce((sum, option) => sum + option.votes, 0)

  const sortedOptions = [...options].sort((a, b) => b.votes - a.votes)
  const leader = sortedOptions[0]
  const leaderShare = totalVotes > 0 ? Math.round((leader.votes / totalVotes) * 100) : 0

  return {
    totalVotes,
    leader,
    leaderShare,
  }
}

const findPost = (posts: BulletinPost[], postId: string) =>
  posts.find((post) => post.id === postId)

const communicationsHighlights = (posts: BulletinPost[]) =>
  posts
    .filter((post) => post.status === "published")
    .slice(0, 3)
    .map((post) => ({
      id: post.id,
      title: post.title,
      message: excerpt(post.message, 100),
      createdAt: post.createdAt,
    }))

const updateCommentDrafts = (
  drafts: Record<string, string>,
  postId: string,
  value: string
) => ({
  ...drafts,
  [postId]: value,
})

const addCommentToPosts = (
  posts: BulletinPost[],
  postId: string,
  comment: BulletinComment
) =>
  posts.map((post) =>
    post.id === postId
      ? {
          ...post,
          comments: [comment, ...post.comments],
        }
      : post
  )

const updateCommentStatus = (
  posts: BulletinPost[],
  postId: string,
  commentId: string,
  status: BulletinStatus
) =>
  posts.map((post) =>
    post.id === postId
      ? {
          ...post,
          comments: post.comments.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  status,
                  flagged: status !== "published" ? comment.flagged : false,
                }
              : comment
          ),
        }
      : post
  )

const updatePostStatus = (
  posts: BulletinPost[],
  postId: string,
  status: BulletinStatus
) =>
  posts.map((post) =>
    post.id === postId
      ? {
          ...post,
          status,
          flagged: status !== "published" ? post.flagged : false,
        }
      : post
  )

const removeRejectedContent = (posts: BulletinPost[]) =>
  posts.filter((post) => post.status !== "rejected")

const redactMatches = (matches: string[]) =>
  matches.map((match) => match.toUpperCase()).join(", ")

const mergeDraftsWithPosts = (
  drafts: Record<string, string>,
  posts: BulletinPost[]
) => {
  const nextDrafts = { ...drafts }
  posts.forEach((post) => {
    if (!(post.id in nextDrafts)) {
      nextDrafts[post.id] = ""
    }
  })

  return nextDrafts
}

const moderationMessage = (
  action: ModerationAction,
  title: string,
  role: Role
) => {
  const actor = roleDetails[role].label
  if (action === "approve") {
    return `${actor} approved “${title}”.`
  }

  return `${actor} rejected “${title}”.`
}

const filterPendingComments = (posts: BulletinPost[]) =>
  posts.flatMap((post) =>
    post.comments
      .filter((comment) => comment.status === "pending")
      .map((comment) => ({ comment, post }))
  )

const filterPendingPosts = (posts: BulletinPost[]) =>
  posts.filter((post) => post.status === "pending")

const filterPublishedPosts = (posts: BulletinPost[]) =>
  posts.filter((post) => post.status === "published")

const totalSurveyVotes = (options: SurveyDefinition["options"]) =>
  options.reduce((sum, option) => sum + option.votes, 0)

const calculateVoteShare = (votes: number, total: number) =>
  total === 0 ? 0 : Math.round((votes / total) * 100)

const commentStatusBadgeVariant = (status: BulletinStatus) => {
  switch (status) {
    case "pending":
      return "secondary" as const
    case "rejected":
      return "destructive" as const
    default:
      return "outline" as const
  }
}

const sortByNewest = <T extends { createdAt: string }>(items: T[]) =>
  [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

const getModerationLogEntry = (
  targetId: string,
  targetType: "post" | "comment",
  action: ModerationAction,
  moderatorRole: Role,
  moderatorName: string
): ModerationLogEntry => ({
  id: generateId(),
  targetId,
  targetType,
  action,
  moderatorRole,
  moderator: moderatorName,
  timestamp: new Date().toISOString(),
})

const hasContentRights = (role: Role) => can(role, "createPost") || can(role, "comment")

const CommunicationsHub = () => {
  const [role, setRole] = useState<Role>("resident")
  const [posts, setPosts] = useState<BulletinPost[]>(sortByNewest(initialPosts))
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    defaultCommentDrafts(initialPosts)
  )
  const [newPostTitle, setNewPostTitle] = useState("")
  const [newPostMessage, setNewPostMessage] = useState("")
  const [feedback, setFeedback] = useState<string | null>(null)
  const [moderationLog, setModerationLog] = useState<ModerationLogEntry[]>([])
  const [surveyOptions, setSurveyOptions] = useState(getInitialSurveyOptions)
  const [surveyParticipation, setSurveyParticipation] = useState(
    initialSurveyParticipation
  )
  const [lobbyMode, setLobbyMode] = useState(false)
  const [surveyFeedback, setSurveyFeedback] = useState<string | null>(null)

  const canCreatePost = can(role, "createPost")
  const canComment = can(role, "comment")
  const canModerate = can(role, "moderate")
  const canVote = can(role, "participateSurvey")
  const canToggleLobby = can(role, "toggleLobby")

  const publishedPosts = useMemo(
    () => filterPublishedPosts(posts),
    [posts]
  )
  const pendingPosts = useMemo(() => filterPendingPosts(posts), [posts])
  const pendingComments = useMemo(() => filterPendingComments(posts), [posts])

  const mergedDrafts = useMemo(
    () => mergeDraftsWithPosts(commentDrafts, posts),
    [commentDrafts, posts]
  )

  const totalVotes = useMemo(() => totalSurveyVotes(surveyOptions), [surveyOptions])
  const lobbyStats = useMemo(
    () => buildLobbyStats(surveyOptions),
    [surveyOptions]
  )

  const highlights = useMemo(
    () => communicationsHighlights(posts),
    [posts]
  )

  const handleRoleChange = (nextRole: Role) => {
    setRole(nextRole)
    setFeedback(null)
    setSurveyFeedback(null)
  }

  const handlePostSubmit = () => {
    if (!canCreatePost) {
      setFeedback("You do not have permission to post to the bulletin board.")
      return
    }

    const trimmedTitle = newPostTitle.trim()
    const trimmedMessage = newPostMessage.trim()

    if (!trimmedTitle || !trimmedMessage) {
      setFeedback("Add both a title and message before submitting.")
      return
    }

    const filteredTitle = filterContent(trimmedTitle)
    const filteredMessage = filterContent(trimmedMessage)

    const post: BulletinPost = {
      id: generateId(),
      title: filteredTitle.cleanText,
      author: roleDetails[role].defaultAuthor,
      role,
      message: filteredMessage.cleanText,
      createdAt: new Date().toISOString(),
      status: filteredTitle.flagged || filteredMessage.flagged ? "pending" : "published",
      flagged: filteredTitle.flagged || filteredMessage.flagged,
      matches: Array.from(new Set([...filteredTitle.matches, ...filteredMessage.matches])),
      comments: [],
    }

    setPosts((previous) => sortByNewest([post, ...previous]))
    setCommentDrafts((drafts) => updateCommentDrafts(drafts, post.id, ""))

    if (post.status === "pending") {
      setFeedback(
        "Your post was submitted for moderation because it triggered the content filter."
      )
    } else {
      setFeedback("Post published to the community bulletin board.")
    }

    setNewPostTitle("")
    setNewPostMessage("")
  }

  const handleCommentSubmit = (postId: string) => {
    if (!canComment) {
      setFeedback("You do not have permission to comment on bulletin posts.")
      return
    }

    const draft = mergedDrafts[postId]?.trim() ?? ""

    if (!draft) {
      setFeedback("Enter a comment before submitting.")
      return
    }

    const filteredComment = filterContent(draft)

    const comment: BulletinComment = {
      id: generateId(),
      author: roleDetails[role].defaultAuthor,
      role,
      message: filteredComment.cleanText,
      createdAt: new Date().toISOString(),
      status: filteredComment.flagged ? "pending" : "published",
      flagged: filteredComment.flagged,
      matches: filteredComment.matches,
    }

    setPosts((previous) =>
      sortByNewest(addCommentToPosts(previous, postId, comment))
    )
    setCommentDrafts((drafts) => updateCommentDrafts(drafts, postId, ""))

    if (comment.status === "pending") {
      setFeedback(
        "Your comment is awaiting moderation due to restricted language."
      )
    } else {
      setFeedback("Comment published.")
    }
  }

  const recordModeration = (
    action: ModerationAction,
    targetType: "post" | "comment",
    targetId: string,
    label: string
  ) => {
    const entry = getModerationLogEntry(
      targetId,
      targetType,
      action,
      role,
      roleDetails[role].defaultAuthor
    )

    setModerationLog((previous) => [entry, ...previous])
    setFeedback(moderationMessage(action, label, role))
  }

  const handlePostModeration = (postId: string, action: ModerationAction) => {
    if (!canModerate) {
      setFeedback("You do not have permission to moderate content.")
      return
    }

    const post = findPost(posts, postId)

    if (!post) {
      setFeedback("Post could not be found for moderation.")
      return
    }

    const nextStatus = action === "approve" ? "published" : "rejected"
    setPosts((previous) =>
      action === "reject"
        ? removeRejectedContent(updatePostStatus(previous, postId, nextStatus))
        : updatePostStatus(previous, postId, nextStatus)
    )
    recordModeration(action, "post", post.id, post.title)
  }

  const handleCommentModeration = (
    postId: string,
    commentId: string,
    action: ModerationAction
  ) => {
    if (!canModerate) {
      setFeedback("You do not have permission to moderate content.")
      return
    }

    const post = findPost(posts, postId)
    const comment = post?.comments.find((entry) => entry.id === commentId)

    if (!post || !comment) {
      setFeedback("Comment could not be found for moderation.")
      return
    }

    const nextStatus = action === "approve" ? "published" : "rejected"

    setPosts((previous) =>
      action === "reject"
        ? updateCommentStatus(previous, postId, commentId, nextStatus).map((entry) => ({
            ...entry,
            comments: entry.comments.filter((item) => item.status !== "rejected"),
          }))
        : updateCommentStatus(previous, postId, commentId, nextStatus)
    )
    recordModeration(action, "comment", comment.id, `comment on ${post.title}`)
  }

  const handleVote = (optionId: string) => {
    if (!canVote) {
      setSurveyFeedback("This role cannot submit survey responses.")
      return
    }

    if (surveyParticipation[role]) {
      setSurveyFeedback("You have already voted in this survey.")
      return
    }

    setSurveyOptions((previous) =>
      previous.map((option) =>
        option.id === optionId
          ? { ...option, votes: option.votes + 1 }
          : option
      )
    )

    setSurveyParticipation((previous) => ({
      ...previous,
      [role]: true,
    }))
    setSurveyFeedback("Thank you for voting! Your response has been recorded.")
  }

  const handleLobbyToggle = (checked: boolean) => {
    if (!canToggleLobby) {
      setFeedback("This role cannot control the lobby display.")
      return
    }

    setLobbyMode(checked)
  }

  const renderModerationNotice = (flagged: boolean, matches: string[]) => {
    if (!flagged) {
      return null
    }

    return (
      <p className="text-xs text-amber-600 dark:text-amber-400" data-testid="moderation-notice">
        {`Content filtered: ${redactMatches(matches)}`}
      </p>
    )
  }

  const lobbyDisplay = lobbyMode && (
    <Card
      data-testid="lobby-display"
      className="border-primary/30 bg-primary/5 backdrop-blur"
    >
      <CardHeader>
        <CardTitle>Lobby Display</CardTitle>
        <CardDescription>
          Rotating highlights for the entrance display. Content is read-only and
          auto-refreshes from approved posts and survey data.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <section>
          <h4 className="mb-2 font-semibold">Bulletin Highlights</h4>
          <ul className="space-y-3">
            {highlights.length === 0 && (
              <li className="text-sm text-muted-foreground">
                No approved posts yet. Moderators can approve submissions to
                populate the lobby display.
              </li>
            )}
            {highlights.map((highlight) => (
              <li
                key={highlight.id}
                className="rounded-lg border border-dashed border-primary/40 p-3"
              >
                <p className="font-medium">{highlight.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(highlight.createdAt)}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {highlight.message}
                </p>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h4 className="mb-2 font-semibold">Survey Snapshot</h4>
          <div className="rounded-lg border border-dashed border-primary/40 p-4">
            <p className="text-sm font-medium">{surveyDefinition.question}</p>
            <p className="text-xs text-muted-foreground">
              {surveyDefinition.closingNote}
            </p>
            <div className="mt-4 space-y-3">
              {surveyOptions.map((option) => (
                <div key={option.id}>
                  <p className="text-sm font-semibold">{option.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {calculateVoteShare(option.votes, totalVotes)}% • {option.votes} votes
                  </p>
                </div>
              ))}
            </div>
            {lobbyStats.leader && (
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary">
                Leading: {lobbyStats.leader.label} ({lobbyStats.leaderShare}% of {lobbyStats.totalVotes} votes)
              </p>
            )}
          </div>
        </section>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6" data-testid="communications-hub">
      <Card>
        <CardHeader className="gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Resident Communications Hub</CardTitle>
            <CardDescription>
              Manage announcements, conversations, and surveys with built-in
              safeguards for respectful collaboration.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Lobby display</span>
            <Switch
              data-testid="lobby-toggle"
              checked={lobbyMode}
              onCheckedChange={handleLobbyToggle}
            />
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="space-y-3">
            <label className="block text-sm font-semibold" htmlFor="role-selector">
              Impersonate role
            </label>
            <select
              id="role-selector"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={role}
              data-testid="role-selector"
              onChange={(event) => handleRoleChange(event.target.value as Role)}
            >
              {Object.entries(roleDetails).map(([value, details]) => (
                <option key={value} value={value}>
                  {details.label}
                </option>
              ))}
            </select>
            <p className="text-sm text-muted-foreground">
              {roleDetails[role].summary}
            </p>
            <div className="flex flex-wrap gap-2" data-testid="role-permissions">
              <Badge variant={canCreatePost ? "default" : "outline"}>
                Post
              </Badge>
              <Badge variant={canComment ? "default" : "outline"}>
                Comment
              </Badge>
              <Badge variant={canModerate ? "default" : "outline"}>
                Moderate
              </Badge>
              <Badge variant={canVote ? "default" : "outline"}>Vote</Badge>
              <Badge variant={canToggleLobby ? "default" : "outline"}>Lobby</Badge>
            </div>
          </section>
          <section className="space-y-2">
            <p className="text-sm font-semibold">Content safety filter</p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {bannedWords.map((entry) => (
                <li key={entry.term}>
                  <span className="font-medium uppercase text-muted-foreground/80">
                    {entry.term}
                  </span>
                  : {entry.guidance}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Flagged submissions enter the moderation queue until a moderator or
              admin approves them.
            </p>
          </section>
        </CardContent>
        {feedback && (
          <CardFooter>
            <p className="text-sm text-primary" data-testid="feedback-banner">
              {feedback}
            </p>
          </CardFooter>
        )}
      </Card>

      {lobbyDisplay}

      {hasContentRights(role) && (
        <Card data-testid="bulletin-form">
          <CardHeader>
            <CardTitle>Create a bulletin post</CardTitle>
            <CardDescription>
              Share updates with housemates. Content is filtered automatically
              before publishing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="post-title">
                Title
              </label>
              <Input
                id="post-title"
                value={newPostTitle}
                data-testid="post-title"
                maxLength={120}
                onChange={(event) => setNewPostTitle(event.target.value)}
                placeholder="Community dinner on Saturday"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="post-message">
                Message
              </label>
              <Textarea
                id="post-message"
                value={newPostMessage}
                data-testid="post-message"
                rows={4}
                maxLength={800}
                onChange={(event) => setNewPostMessage(event.target.value)}
                placeholder="Let everyone know about your update..."
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="button"
              data-testid="submit-post"
              onClick={handlePostSubmit}
              disabled={!canCreatePost}
            >
              Submit update
            </Button>
          </CardFooter>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Community bulletin</CardTitle>
          <CardDescription>
            Approved announcements appear here immediately. Comments inherit the
            same moderation safeguards as posts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4" data-testid="published-posts">
            {publishedPosts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No published posts yet. Start the conversation with a new
                bulletin update.
              </p>
            )}
            {publishedPosts.map((post) => (
              <article
                key={post.id}
                data-testid="post-card"
                className="rounded-lg border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{post.title}</h3>
                    <p className="text-xs text-muted-foreground">
                      {post.author} • {formatDate(post.createdAt)}
                    </p>
                  </div>
                  <Badge variant={statusBadgeVariant(post.status)}>
                    {statusLabel(post.status)}
                  </Badge>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {post.message}
                </p>
                {renderModerationNotice(post.flagged, post.matches)}
                <div className="mt-4 space-y-3" data-testid="post-comments">
                  {post.comments
                    .filter((comment) => comment.status === "published")
                    .map((comment) => (
                      <div
                        key={comment.id}
                        className="rounded-md border border-border/50 bg-muted/50 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-medium">{comment.author}</p>
                          <Badge variant={commentStatusBadgeVariant(comment.status)}>
                            {statusLabel(comment.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {comment.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(comment.createdAt)}
                        </p>
                      </div>
                    ))}
                </div>
                {canComment && (
                  <form
                    className="mt-4 space-y-2"
                    onSubmit={(event) => {
                      event.preventDefault()
                      handleCommentSubmit(post.id)
                    }}
                  >
                    <label className="text-sm font-medium" htmlFor={`comment-${post.id}`}>
                      Add a comment
                    </label>
                    <Textarea
                      id={`comment-${post.id}`}
                      data-testid="comment-input"
                      value={mergedDrafts[post.id] ?? ""}
                      onChange={(event) =>
                        setCommentDrafts((drafts) =>
                          updateCommentDrafts(drafts, post.id, event.target.value)
                        )
                      }
                      rows={2}
                      maxLength={400}
                      placeholder="Share your thoughts with the community"
                    />
                    <Button
                      type="submit"
                      data-testid="comment-submit"
                      disabled={!canComment}
                    >
                      Post comment
                    </Button>
                  </form>
                )}
              </article>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card data-testid="moderation-queue">
        <CardHeader>
          <CardTitle>Moderation queue</CardTitle>
          <CardDescription>
            Flagged posts and comments are listed here. Moderators approve or
            reject content to keep the space healthy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingPosts.length === 0 && pendingComments.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No items need review. Great job keeping the board respectful!
            </p>
          )}
          {pendingPosts.map((post) => (
            <article
              key={post.id}
              data-testid="moderation-item"
              className="rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/50 dark:bg-amber-950/40 dark:text-amber-100"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{post.title}</h3>
                  <p className="text-xs uppercase tracking-wide">
                    Pending bulletin post
                  </p>
                </div>
                <Badge variant="secondary">Awaiting review</Badge>
              </div>
              <p className="mt-2 text-sm">{post.message}</p>
              {renderModerationNotice(post.flagged, post.matches)}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  data-testid="approve-action"
                  variant="default"
                  disabled={!canModerate}
                  onClick={() => handlePostModeration(post.id, "approve")}
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  data-testid="reject-action"
                  variant="destructive"
                  disabled={!canModerate}
                  onClick={() => handlePostModeration(post.id, "reject")}
                >
                  Reject
                </Button>
              </div>
            </article>
          ))}
          {pendingComments.map(({ post, comment }) => (
            <article
              key={comment.id}
              data-testid="moderation-item"
              className="rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-amber-900 dark:border-amber-500/50 dark:bg-amber-950/40 dark:text-amber-100"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold">Comment on {post.title}</h3>
                  <p className="text-xs uppercase tracking-wide">
                    Pending comment
                  </p>
                </div>
                <Badge variant="secondary">Awaiting review</Badge>
              </div>
              <p className="mt-2 text-sm">{comment.message}</p>
              {renderModerationNotice(comment.flagged, comment.matches)}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  data-testid="approve-action"
                  variant="default"
                  disabled={!canModerate}
                  onClick={() =>
                    handleCommentModeration(post.id, comment.id, "approve")
                  }
                >
                  Approve
                </Button>
                <Button
                  type="button"
                  data-testid="reject-action"
                  variant="destructive"
                  disabled={!canModerate}
                  onClick={() =>
                    handleCommentModeration(post.id, comment.id, "reject")
                  }
                >
                  Reject
                </Button>
              </div>
            </article>
          ))}
        </CardContent>
        {!canModerate && (
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Only moderators and admins can change the status of queue items.
            </p>
          </CardFooter>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Survey participation</CardTitle>
          <CardDescription>
            Vote on the next community initiative. Results refresh after every
            submission.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <section className="space-y-4">
            <div>
              <h3 className="font-semibold">{surveyDefinition.question}</h3>
              <p className="text-xs text-muted-foreground">
                {surveyDefinition.closingNote}
              </p>
            </div>
            <div className="space-y-3">
              {surveyOptions.map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start border-border bg-background text-left",
                    !canVote && "pointer-events-none opacity-60"
                  )}
                  data-testid={`survey-option-${option.id}`}
                  disabled={!canVote}
                  onClick={() => handleVote(option.id)}
                >
                  <div>
                    <p className="font-medium">{option.label}</p>
                    {option.description && (
                      <p className="text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </section>
          <section className="space-y-4" data-testid="survey-results">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>Real-time results</span>
              <span>{totalVotes} votes</span>
            </div>
            <div className="space-y-4">
              {surveyOptions.map((option) => (
                <div key={option.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{option.label}</span>
                    <span>{calculateVoteShare(option.votes, totalVotes)}%</span>
                  </div>
                  <Progress value={calculateVoteShare(option.votes, totalVotes)} />
                </div>
              ))}
            </div>
            {surveyFeedback && (
              <p className="text-xs text-primary" data-testid="survey-feedback">
                {surveyFeedback}
              </p>
            )}
          </section>
        </CardContent>
      </Card>

      <Card data-testid="moderation-log">
        <CardHeader>
          <CardTitle>Moderation activity</CardTitle>
          <CardDescription>
            A transparent record of moderation outcomes keeps the community
            informed and accountable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {moderationLog.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No moderation actions have been recorded yet.
            </p>
          )}
          {moderationLog.map((entry) => (
            <div
              key={entry.id}
              className="rounded-md border border-border/60 bg-muted/40 p-3 text-sm"
            >
              <p>
                <span className="font-medium">{entry.moderator}</span> ({
                  roleDetails[entry.moderatorRole].label
                }) {entry.action === "approve" ? "approved" : "rejected"} a
                {" "}
                {entry.targetType}.
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(entry.timestamp)}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default CommunicationsHub
