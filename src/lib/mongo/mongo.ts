import { MongoClient, type Db } from 'mongodb'

const uri = process.env.MONGODB_URI

if (!uri) {
  // Allow local tooling that doesn't require DB (typecheck) to still proceed.
  // Runtime endpoints will throw when invoked.
}

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function getDb() {
  if (!uri) throw new Error('MONGODB_URI is not set')

  if (cachedDb && cachedClient) return cachedDb

  const client = new MongoClient(uri)
  await client.connect()

  cachedClient = client
  cachedDb = client.db(process.env.MONGODB_DB || 'agentflow')
  return cachedDb
}

