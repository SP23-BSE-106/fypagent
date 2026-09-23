import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/mongo/mongo'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'
import { chunkText } from '@/lib/rag/chunker'
import { generateEmbedding, EMBEDDING_MODEL, EMBEDDING_DIMENSION } from '@/lib/rag/embeddings'
import { kickOffIndexBuild } from '@/lib/rag/vectorStore'

export async function POST(req: NextRequest) {
  try {
    const token = await getSessionTokenFromCookies()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyJwt(token)
    const userId = payload.sub

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const textContent = formData.get('textContent') as string | null
    const fileName = formData.get('name') as string || file?.name || 'Untitled_Document.txt'

    let extractedText = ''
    const isPdf = !!file && (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf')

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer())

      if (isPdf) {
        // pdf-parse v2.x is class-based: new PDFParse({ data }).getText()
        // The old v1 call style `pdfParse(buffer)` throws, so we must NEVER fall
        // back to decoding raw PDF bytes as UTF-8 — that produced "xref/trailer"
        // garbage chunks instead of readable policy text.
        try {
          const { PDFParse } = await import('pdf-parse')
          const parser = new PDFParse({ data: buffer })
          try {
            const result = await parser.getText()
            extractedText = result.text || ''
          } finally {
            await parser.destroy().catch(() => {})
          }
        } catch (pdfErr) {
          console.error('[RAG Upload] PDF text extraction failed:', pdfErr)
          return NextResponse.json(
            {
              error:
                'Could not extract text from this PDF. It may be corrupted, password-protected, or a scanned (image-only) PDF with no text layer. Please upload a text-based PDF, .txt, or .md file.',
            },
            { status: 422 }
          )
        }
      } else {
        extractedText = new TextDecoder('utf-8').decode(buffer)
      }
    } else if (textContent) {
      extractedText = textContent
    } else {
      return NextResponse.json({ error: 'No file or text content provided' }, { status: 400 })
    }

    if (!extractedText.trim()) {
      return NextResponse.json({ error: 'Extracted document content is empty' }, { status: 400 })
    }

    // Safety net: never ingest raw PDF binary as if it were document text.
    if (isPdf && (extractedText.startsWith('%PDF-') || extractedText.includes('startxref'))) {
      console.error('[RAG Upload] Extraction returned raw PDF structure data — rejecting upload.')
      return NextResponse.json(
        { error: 'PDF text extraction produced raw PDF data instead of readable text. Upload rejected.' },
        { status: 422 }
      )
    }

    console.log('[RAG Upload] Starting upload process for:', fileName)
    console.log('[RAG Upload] Extracted text length:', extractedText.length)

    const db = await getDb()
    const documents = db.collection('rag_documents')
    const chunksColl = db.collection('rag_chunks')

    // 1. Save Document Record with safe data types
    const now = new Date()
    const docRecord = {
      userId: String(userId), // Ensure string type
      name: String(fileName), // Ensure string type
      source: {
        type: file ? 'file' : 'text',
        filename: String(fileName),
      },
      preview: String(extractedText.slice(0, 200)) + '...',
      createdAt: now,
    }

    console.log('[RAG Upload] Inserting document record...')
    const insertResult = await documents.insertOne(docRecord)
    const documentId = insertResult.insertedId.toString()
    console.log('[RAG Upload] Document created with ID:', documentId)

    // 2. Chunk Text
    const textChunks = chunkText(extractedText, { chunkSize: 500, overlap: 50 })

    if (textChunks.length === 0) {
      return NextResponse.json({ error: 'No text chunks generated from document' }, { status: 400 })
    }

    // 3. Generate embeddings with the local model, then store them in MongoDB.
    // generateEmbedding() throws instead of falling back to a fake vector, so a
    // failure here must abort the upload rather than persist garbage vectors.
    console.log(`[RAG Upload] Embedding ${textChunks.length} chunks with ${EMBEDDING_MODEL}...`)
    const embedStartedAt = Date.now()

    const chunkRecords: Array<Record<string, unknown>> = []
    for (const [index, chunkTextStr] of textChunks.entries()) {
      try {
        const vector = await generateEmbedding(chunkTextStr)

        if (vector.length !== EMBEDDING_DIMENSION) {
          throw new Error(
            `Expected ${EMBEDDING_DIMENSION}-dim embedding, received ${vector.length}`
          )
        }

        chunkRecords.push({
          documentId,
          userId,
          chunkIndex: index,
          text: chunkTextStr,
          embedding: vector,
          embeddingModel: EMBEDDING_MODEL,
          createdAt: new Date(),
        })
      } catch (err) {
        console.error(`[RAG Upload] Embedding failed for chunk ${index}:`, err)
        const message = err instanceof Error ? err.message : String(err)
        // Roll back the document record so a partial ingest is not listed.
        await documents.deleteOne({ _id: insertResult.insertedId }).catch(() => {})
        return NextResponse.json(
          {
            error: `Embedding failed on chunk ${index + 1}/${textChunks.length}: ${message}`,
          },
          { status: 500 }
        )
      }
    }

    if (chunkRecords.length === 0) {
      return NextResponse.json({ error: 'Failed to generate embeddings for any chunks' }, { status: 500 })
    }

    console.log(
      `[RAG Upload] Embedded ${chunkRecords.length} chunks in ${Date.now() - embedStartedAt}ms`
    )

    try {
      await chunksColl.insertMany(chunkRecords)
    } catch (dbErr: any) {
      console.error('[RAG Upload] MongoDB insert error:', dbErr)
      // Clean up the document record if chunks failed
      await documents.deleteOne({ _id: insertResult.insertedId })
      return NextResponse.json({ 
        error: `Database error: ${dbErr.message || 'Failed to store chunks'}` 
      }, { status: 500 })
    }

    // Make sure the Atlas vector index exists for this collection. Never block
    // the response on the build (it takes ~35s); retrieval falls back to an
    // exact cosine scan until the index is queryable.
    kickOffIndexBuild()

    return NextResponse.json({
      success: true,
      documentId,
      fileName,
      totalChunks: textChunks.length,
      embeddingModel: EMBEDDING_MODEL,
      message: 'Document ingested, chunked, and embedded.',
    })
  } catch (error: any) {
    console.error('[RAG Upload] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to upload document' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = await getSessionTokenFromCookies()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyJwt(token)
    const userId = payload.sub

    const db = await getDb()
    const docs = await db
      .collection('rag_documents')
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray()

    const formattedDocs = await Promise.all(
      docs.map(async (doc) => {
        const chunkCount = await db
          .collection('rag_chunks')
          .countDocuments({ documentId: doc._id.toString() })

        return {
          id: doc._id.toString(),
          name: doc.name,
          preview: doc.preview || '',
          chunks: chunkCount,
          createdAt: doc.createdAt,
        }
      })
    )

    return NextResponse.json({ documents: formattedDocs })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/rag/upload
 * Remove a single document (JSON body: { documentId }) or the whole knowledge
 * base (JSON body: { all: true }) together with its chunks.
 * Query params ?documentId=... / ?all=1 are also accepted.
 * Only affects the authenticated user's data.
 */
export async function DELETE(req: NextRequest) {
  try {
    const token = await getSessionTokenFromCookies()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyJwt(token)
    const userId = String(payload.sub)

    // Accept both a JSON body ({ documentId } or { all: true }) and query
    // params (?documentId=... or ?all=1).
    const body = await req.json().catch(() => ({} as Record<string, unknown>))
    const { searchParams } = new URL(req.url)
    const documentId =
      (typeof body.documentId === 'string' && body.documentId) ||
      searchParams.get('documentId') ||
      null
    const all = body.all === true || searchParams.get('all') === '1'

    const db = await getDb()
    const documents = db.collection('rag_documents')
    const chunksColl = db.collection('rag_chunks')

    if (all) {
      const chunkResult = await chunksColl.deleteMany({ userId })
      const docResult = await documents.deleteMany({ userId })
      console.log(`[RAG Upload] Cleared knowledge base for user ${userId}: ${docResult.deletedCount} docs, ${chunkResult.deletedCount} chunks`)
      return NextResponse.json({
        success: true,
        deletedDocuments: docResult.deletedCount,
        deletedChunks: chunkResult.deletedCount,
      })
    }

    if (!documentId || !ObjectId.isValid(documentId)) {
      return NextResponse.json({ error: 'Valid documentId is required (or pass all: true)' }, { status: 400 })
    }

    // Chunks reference documents by their string id; scope by userId so users
    // can only delete their own documents.
    const chunkResult = await chunksColl.deleteMany({ documentId, userId })
    const docResult = await documents.deleteOne({ _id: new ObjectId(documentId), userId })

    if (docResult.deletedCount === 0) {
      // Roll back orphaned chunk deletions is unnecessary: chunks only exist alongside a doc.
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    console.log(`[RAG Upload] Deleted document ${documentId} (${chunkResult.deletedCount} chunks)`)
    return NextResponse.json({
      success: true,
      deletedChunks: chunkResult.deletedCount,
    })
  } catch (error) {
    console.error('[RAG Upload] Delete error:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete document'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
