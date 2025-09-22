export type ThreadSummary = {
  id: string
  title: string
  summary?: string
}

export type MessageSummary = {
  id: string
  threadId: string
  authorId: string
  body: string
  createdAt: string
}

export type RoommateProfile = {
  id: string
  name: string
}

export type PollOption = {
  index: number
  text: string
}

export type PollVote = {
  optionIndex: number
  voterId: string
  votedAt: string
}

export type Poll = {
  id: string
  threadId: string
  messageId?: string
  question: string
  options: PollOption[]
  allowAnonymous: boolean
  closesAt: string
  createdBy: string
  createdAt: string
  votes: PollVote[]
}

export type PollCreationInput = {
  threadId: string
  messageId?: string
  question: string
  options: string[]
  allowAnonymous: boolean
  closesAt: Date
  createdBy: string
}

export type PollResult = {
  optionIndex: number
  text: string
  voteCount: number
  percentage: number
}

export const POLL_ERRORS = {
  emptyQuestion: "Poll question is required.",
  insufficientOptions: "Provide at least two poll options.",
  duplicateOptions: "Poll options must be unique.",
  pastDeadline: "Poll closing time must be in the future.",
  invalidOption: "Selected option does not belong to this poll.",
  pollClosed: "Voting has closed for this poll.",
  alreadyVoted: "You have already voted on this poll.",
} as const

const generateId = () => {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const normalizeOptions = (options: string[]): string[] =>
  options.map((option) => option.trim()).filter((option) => option.length > 0)

export const createPoll = (input: PollCreationInput, now = new Date()): Poll => {
  const sanitizedQuestion = input.question.trim()
  if (!sanitizedQuestion) {
    throw new Error(POLL_ERRORS.emptyQuestion)
  }

  const normalizedOptions = normalizeOptions(input.options)
  if (normalizedOptions.length < 2) {
    throw new Error(POLL_ERRORS.insufficientOptions)
  }

  const uniqueOptions = Array.from(new Set(normalizedOptions))
  if (uniqueOptions.length !== normalizedOptions.length) {
    throw new Error(POLL_ERRORS.duplicateOptions)
  }

  if (input.closesAt.getTime() <= now.getTime()) {
    throw new Error(POLL_ERRORS.pastDeadline)
  }

  return {
    id: generateId(),
    threadId: input.threadId,
    messageId: input.messageId,
    question: sanitizedQuestion,
    allowAnonymous: input.allowAnonymous,
    closesAt: input.closesAt.toISOString(),
    createdBy: input.createdBy,
    createdAt: now.toISOString(),
    options: normalizedOptions.map((option, index) => ({
      index,
      text: option,
    })),
    votes: [],
  }
}

export const isPollClosed = (poll: Poll, now = new Date()): boolean =>
  new Date(poll.closesAt).getTime() <= now.getTime()

export const castVote = (poll: Poll, optionIndex: number, voterId: string, now = new Date()): Poll => {
  if (isPollClosed(poll, now)) {
    throw new Error(POLL_ERRORS.pollClosed)
  }

  const optionExists = poll.options.some((option) => option.index === optionIndex)
  if (!optionExists) {
    throw new Error(POLL_ERRORS.invalidOption)
  }

  const hasExistingVote = poll.votes.some((vote) => vote.voterId === voterId)
  if (hasExistingVote) {
    throw new Error(POLL_ERRORS.alreadyVoted)
  }

  return {
    ...poll,
    votes: [
      ...poll.votes,
      {
        optionIndex,
        voterId,
        votedAt: now.toISOString(),
      },
    ],
  }
}

export const getPollResults = (poll: Poll): PollResult[] => {
  const totalVotes = poll.votes.length
  return poll.options.map((option) => {
    const voteCount = poll.votes.filter((vote) => vote.optionIndex === option.index).length
    const percentage = totalVotes === 0 ? 0 : Math.round((voteCount / totalVotes) * 1000) / 10

    return {
      optionIndex: option.index,
      text: option.text,
      voteCount,
      percentage,
    }
  })
}

export const getVotesByOption = (poll: Poll): Record<number, PollVote[]> => {
  return poll.votes.reduce<Record<number, PollVote[]>>((accumulator, vote) => {
    accumulator[vote.optionIndex] = [...(accumulator[vote.optionIndex] ?? []), vote]
    return accumulator
  }, {})
}
