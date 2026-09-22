import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongo/mongo'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'
import { chunkText } from '@/lib/rag/chunker'
import { generateEmbedding } from '@/lib/rag/embeddings'

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

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer())

      if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        try {
          // Require pdf-parse for CJS/ESM compatibility
          const pdfParse = require('pdf-parse')
          const pdfData = await pdfParse(buffer)
          extractedText = pdfData.text || ''
        } catch (pdfErr) {
          console.warn('PDF parsing fallback to raw text decoding:', pdfErr)
          extractedText = new TextDecoder('utf-8').decode(buffer)
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

    // 3. Generate Embeddings using Kimi API & Store in MongoDB
    const kimiApiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY

    const chunkInsertPromises = textChunks.map(async (chunkTextStr, index) => {
      try {
        const vector = await generateEmbedding(chunkTextStr, kimiApiKey)
        
        // Validate embedding
        if (!Array.isArray(vector) || vector.length === 0) {
          console.error(`[RAG Upload] Invalid embedding for chunk ${index}:`, vector)
          throw new Error(`Invalid embedding generated for chunk ${index}`)
        }
        
        // Ensure all values are numbers
        if (!vector.every(v => typeof v === 'number' && isFinite(v))) {
          console.error(`[RAG Upload] Non-numeric values in embedding for chunk ${index}`)
          throw new Error(`Non-numeric values in embedding for chunk ${index}`)
        }

        return {
          documentId,
          userId,
          chunkIndex: index,
          text: chunkTextStr,
          embedding: vector,
          createdAt: new Date(),
        }
      } catch (err) {
        console.error(`[RAG Upload] Error processing chunk ${index}:`, err)
        throw err
      }
    })

    const chunkRecords = await Promise.all(chunkInsertPromises)
    
    if (chunkRecords.length === 0) {
      return NextResponse.json({ error: 'Failed to generate embeddings for any chunks' }, { status: 500 })
    }

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

    return NextResponse.json({
      success: true,
      documentId,
      fileName,
      totalChunks: textChunks.length,
      message: 'Document successfully ingested, chunked, and embedded with Kimi.',
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
