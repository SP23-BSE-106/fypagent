import type { Db, ObjectId } from 'mongodb'

import { cleanAgentName, nextAvailableAgentName, normalizeAgentName } from '@/lib/agentName'

/**
 * Everything the agents API needs in order to keep names unique against
 * MongoDB. Shared by `POST /api/agents` and `PATCH /api/agents/{id}` — the
 * create and rename paths have to see the same list, or renaming onto an
 * existing name would succeed while creating the same name is refused.
 */

let agentNameIndex: Promise<unknown> | null = null

/**
 * A findOne() check alone loses the race if two saves land in the same
 * instant, so uniqueness also lives in the database. Memoised for the life of
 * the warm instance; if it ever fails the handlers' own checks still run, so
 * the index is an extra guarantee rather than a single point of failure.
 */
export function ensureAgentNameIndex(db: Db): Promise<unknown> {
  if (!agentNameIndex) {
    agentNameIndex = db
      .collection('agents')
      .createIndex(
        { userId: 1, nameNormalized: 1 },
        {
          unique: true,
          // Documents written before `nameNormalized` existed are left out, so
          // pre-existing data can never block index creation.
          partialFilterExpression: { nameNormalized: { $type: 'string' } },
        },
      )
      .catch(() => null)
  }
  return agentNameIndex
}

/** Duplicate key from the unique index — surfaced as the same 409 as a probe. */
export function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000
}

/**
 * Every name this user owns, optionally excluding one agent (so a rename can
 * compare against the others without flagging itself).
 */
export async function listTakenNames(
  db: Db,
  userId: string,
  excludeId?: string,
): Promise<string[]> {
  const rows = await db
    .collection('agents')
    .find({ userId }, { projection: { name: 1 } })
    .toArray()

  return rows
    .filter((row) => !excludeId || String(row._id) !== excludeId)
    .map((row) => cleanAgentName(row.name))
    .filter(Boolean)
}

/**
 * One-time repair for agents created before names were checked for uniqueness.
 *
 * Those documents predate `nameNormalized`, which is exactly what the partial
 * unique index skips — so "Untitled Draft" could exist three times and would
 * keep existing while every new agent is refused. Oldest keeps its name, later
 * duplicates get a readable number, and every touched document gains the
 * normalised field so the index takes over from here. Best effort: a failure
 * here must never block a save, because the request's own duplicate check
 * still runs afterwards.
 */
export async function repairLegacyDuplicateNames(db: Db, userId: string): Promise<void> {
  try {
    const legacy = await db
      .collection('agents')
      .countDocuments({ userId, nameNormalized: { $exists: false } })

    if (legacy === 0) return

    const rows = await db
      .collection('agents')
      .find({ userId }, { projection: { name: 1 } })
      .sort({ createdAt: 1 })
      .toArray()

    const seen = new Set<string>()

    for (const row of rows) {
      const current = normalizeAgentName(row.name)
      const alreadyHasField = typeof row.nameNormalized === 'string'

      if (current && !seen.has(current)) {
        seen.add(current)
        if (!alreadyHasField) {
          await db
            .collection('agents')
            .updateOne({ _id: row._id }, { $set: { nameNormalized: current } })
        }
        continue
      }

      const repaired = nextAvailableAgentName(cleanAgentName(row.name) || 'New Agent', [...seen])
      const repairedKey = normalizeAgentName(repaired)
      seen.add(repairedKey)

      await db
        .collection('agents')
        .updateOne({ _id: row._id }, { $set: { name: repaired, nameNormalized: repairedKey } })
    }
  } catch (error) {
    console.warn('[agents] legacy name repair skipped:', error)
  }
}

/** Convenience type so handlers do not each import mongodb. */
export type { Db, ObjectId }
