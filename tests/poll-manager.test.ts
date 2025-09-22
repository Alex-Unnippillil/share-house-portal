import { describe, expect, test } from "vitest"

import {
  POLL_ERRORS,
  castVote,
  createPoll,
  getPollResults,
  isPollClosed,
  type Poll,
} from "@/lib/poll-manager"

describe("poll manager", () => {
  const baseNow = new Date("2024-07-01T12:00:00.000Z")

  const buildPoll = (overrides?: Partial<Poll>) =>
    createPoll(
      {
        threadId: overrides?.threadId ?? "thread-1",
        messageId: overrides?.messageId ?? "message-1",
        question: overrides?.question ?? "Where should we host the next roommate dinner?",
        options: overrides?.options?.map((option) => option.text) ?? ["Roof deck", "Living room", "Try a restaurant"],
        allowAnonymous: overrides?.allowAnonymous ?? true,
        closesAt: overrides?.closesAt ? new Date(overrides.closesAt) : new Date(baseNow.getTime() + 1000 * 60 * 60 * 4),
        createdBy: overrides?.createdBy ?? "alex",
      },
      overrides?.createdAt ? new Date(overrides.createdAt) : baseNow,
    )

  test("createPoll trims input and enforces option uniqueness", () => {
    const poll = createPoll(
      {
        threadId: "thread-1",
        messageId: "message-1",
        question: "  Favorite meal prep night?  ",
        options: ["Monday", "Wednesday", "Friday"],
        allowAnonymous: true,
        closesAt: new Date(baseNow.getTime() + 1000 * 60 * 60 * 2),
        createdBy: "jamie",
      },
      baseNow,
    )

    expect(poll.question).toBe("Favorite meal prep night?")
    expect(poll.options.map((option) => option.text)).toEqual(["Monday", "Wednesday", "Friday"])
  })

  test("createPoll throws for duplicate or past-due options", () => {
    expect(() =>
      createPoll(
        {
          threadId: "thread-1",
          messageId: "message-1",
          question: "Duplicate options",
          options: ["Same", "Same"],
          allowAnonymous: true,
          closesAt: new Date(baseNow.getTime() + 1000 * 60 * 30),
          createdBy: "alex",
        },
        baseNow,
      ),
    ).toThrowError(POLL_ERRORS.duplicateOptions)

    expect(() =>
      createPoll(
        {
          threadId: "thread-1",
          messageId: "message-1",
          question: "Past due",
          options: ["Option A", "Option B"],
          allowAnonymous: false,
          closesAt: new Date(baseNow.getTime() - 1000 * 60 * 5),
          createdBy: "alex",
        },
        baseNow,
      ),
    ).toThrowError(POLL_ERRORS.pastDeadline)
  })

  test("castVote records a new vote and prevents duplicates", () => {
    let poll = buildPoll()

    poll = castVote(poll, 0, "alex", new Date(baseNow.getTime() + 1000 * 60 * 10))
    expect(poll.votes).toHaveLength(1)
    expect(poll.votes[0]).toMatchObject({ optionIndex: 0, voterId: "alex" })

    expect(() => castVote(poll, 1, "alex", new Date(baseNow.getTime() + 1000 * 60 * 12))).toThrowError(
      POLL_ERRORS.alreadyVoted,
    )
  })

  test("castVote rejects votes after the poll closes", () => {
    const poll = buildPoll({ closesAt: new Date(baseNow.getTime() + 1000 * 60 * 30).toISOString() })

    const closedMoment = new Date(baseNow.getTime() + 1000 * 60 * 60 * 6)
    expect(isPollClosed(poll, closedMoment)).toBe(true)
    expect(() => castVote(poll, 0, "jamie", closedMoment)).toThrowError(POLL_ERRORS.pollClosed)
  })

  test("getPollResults summarizes vote counts and percentages", () => {
    let poll = buildPoll({ allowAnonymous: false })

    poll = castVote(poll, 0, "alex", new Date(baseNow.getTime() + 1000 * 60 * 5))
    poll = castVote(poll, 1, "jamie", new Date(baseNow.getTime() + 1000 * 60 * 6))
    poll = castVote(poll, 0, "morgan", new Date(baseNow.getTime() + 1000 * 60 * 7))

    const results = getPollResults(poll)
    const optionOne = results.find((result) => result.optionIndex === 0)
    const optionTwo = results.find((result) => result.optionIndex === 1)

    expect(optionOne).toMatchObject({ voteCount: 2, percentage: 66.7 })
    expect(optionTwo).toMatchObject({ voteCount: 1, percentage: 33.3 })
    expect(results.reduce((total, result) => total + result.voteCount, 0)).toBe(3)
  })
})
