/**
 * One definition of what an agent's name is.
 *
 * The create form, the builder's autosave and the API all decide names
 * independently, so they have to share this or one tier accepts what another
 * rejects (e.g. the builder happily writing "Untitled Draft" forever while the
 * create form refuses an empty string). Pure functions only — safe to call from
 * the browser, from a route handler and from the test suite.
 */

/** Collapse whitespace, trim, cap the length. Never returns a half-name. */
export function cleanAgentName(raw: unknown): string {
  return String(raw ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

/**
 * A name has to contain something a person would read as a name — a letter or
 * a digit. Otherwise "!!!", "🤖" or "──" sails through a `.trim()` check and
 * ends up as the agent's displayed title.
 */
export function isUsableAgentName(name: string): boolean {
  return /[\p{L}\p{N}]/u.test(name)
}

/** The key duplicates are compared on: case- and whitespace-insensitive. */
export function normalizeAgentName(raw: unknown): string {
  return cleanAgentName(raw).toLowerCase()
}

/** True when two names would be indistinguishable to a human scanning a list. */
export function isDuplicateAgentName(a: unknown, b: unknown): boolean {
  const left = normalizeAgentName(a)
  const right = normalizeAgentName(b)
  return left.length > 0 && left === right
}

/**
 * Words that carry no identity. Left in, a prompt like "build the support bot"
 * produces "Build The Support Bot Agent" — technically a name, useless as a
 * label in a list of agents.
 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'for', 'to', 'of',
  'in', 'on', 'at', 'with', 'from', 'by', 'is', 'are', 'be', 'been', 'this',
  'that', 'it', 'its', 'as', 'so', 'when', 'what', 'who', 'how', 'why',
  'please', 'could', 'would', 'can', 'will', 'i', 'my', 'me',
])

/**
 * A readable name derived from the prompt, used when the generator returned
 * nothing and the user has not typed one yet. Drops function words, keeps words
 * that carry meaning, and Title-Cases the result — so the agent never falls
 * back to a bare "Agent" or to the raw prompt text.
 */
export function agentNameFromPrompt(prompt: unknown, fallback = 'New Agent'): string {
  const words = cleanAgentName(prompt)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(' ')
    .filter((word) => {
      if (/\p{N}/u.test(word)) return true
      return word.length > 2 && !STOP_WORDS.has(word.toLowerCase())
    })
    .slice(0, 5)

  if (words.length === 0) return fallback

  const titled = words.map((word) => word[0].toUpperCase() + word.slice(1)).join(' ')
  return `${titled} Agent`.slice(0, 80)
}

/**
 * First free variant of `base`: `Support Bot`, `Support Bot (2)`, …
 * Given the caller's existing names, so the caller decides where they come
 * from (a Mongo query on the server, a fetched list in the browser).
 */
export function nextAvailableAgentName(base: string, taken: readonly string[]): string {
  const occupied = new Set(taken.map((name) => normalizeAgentName(name)))
  const clean = cleanAgentName(base) || 'New Agent'

  if (!occupied.has(normalizeAgentName(clean))) return clean

  for (let n = 2; n <= 500; n++) {
    const candidate = `${clean} (${n})`
    if (!occupied.has(normalizeAgentName(candidate))) return candidate
  }

  // Pathological case: hundreds of copies. Still unique, still readable.
  return `${clean} (${Date.now()})`
}
