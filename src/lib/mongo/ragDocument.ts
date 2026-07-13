export type RagDocument = {
  _id?: string
  userId: string
  /** If documents belong to a specific agent/workspace */
  agentId?: string

  name: string
  /** Source metadata: uploaded filename, URL, etc. */
  source?: {
    type?: 'file' | 'url' | 'text'
    url?: string
    filename?: string
    [key: string]: unknown
  }

  /** Used to prevent duplicates */
  contentHash?: string

  /** Optional raw text summary/preview */
  preview?: string

  createdAt: Date
  updatedAt?: Date
}

