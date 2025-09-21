const bannedWordList = [
  {
    term: "spam",
    guidance: "Avoid promotional or repetitive content.",
  },
  {
    term: "scam",
    guidance: "Potentially fraudulent language detected.",
  },
  {
    term: "offensive",
    guidance: "Content violates community guidelines.",
  },
]

export interface FilterResult {
  cleanText: string
  flagged: boolean
  matches: string[]
}

const redactTerm = (term: string) => "★".repeat(Math.max(term.length, 3))

export const filterContent = (input: string): FilterResult => {
  let cleanText = input
  let flagged = false
  const matches = new Set<string>()

  bannedWordList.forEach(({ term }) => {
    const pattern = new RegExp(`\\b${term}\\b`, "gi")
    if (pattern.test(cleanText)) {
      flagged = true
      matches.add(term)
      cleanText = cleanText.replace(pattern, () => redactTerm(term))
    }
  })

  return {
    cleanText: cleanText.trim(),
    flagged,
    matches: Array.from(matches),
  }
}

export const bannedWords = bannedWordList
