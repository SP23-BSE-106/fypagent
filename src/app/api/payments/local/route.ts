import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb } from '@/lib/mongo/mongo'
import { getSessionTokenFromCookies, verifyJwt } from '@/lib/auth/jwt'

export async function POST(request: NextRequest) {
  try {
    const token = await getSessionTokenFromCookies()
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = verifyJwt(token)
    const body = await request.json().catch(() => ({}))

    const { paymentMethod, plan, transactionId, senderPhone, note } = body

    if (!paymentMethod || !transactionId) {
      return NextResponse.json({ error: 'Payment method and Transaction ID are required.' }, { status: 400 })
    }

    const db = await getDb()
    const paymentRequests = db.collection('payment_requests')

    const newRequest = {
      userId: payload.sub,
      userEmail: payload.email,
      paymentMethod, // 'jazzcash' | 'easypaisa' | 'bank_transfer'
      plan: plan || 'monthly_pro',
      transactionId: transactionId.trim(),
      senderPhone: senderPhone?.trim() || '',
      note: note?.trim() || '',
      status: 'pending', // 'pending' | 'approved' | 'rejected'
      createdAt: new Date(),
    }

    await paymentRequests.insertOne(newRequest)

    // Update user status to pending_approval
    await db.collection('users').updateOne(
      { _id: new ObjectId(payload.sub) as any },
      {
        $set: {
          subscriptionStatus: 'pending_approval',
        },
      }
    )

    return NextResponse.json({
      success: true,
      message: 'Payment verification request submitted successfully! An admin will approve it shortly.',
    })
  } catch (error: any) {
    console.error('Local payment submit error:', error)
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
  }
}
