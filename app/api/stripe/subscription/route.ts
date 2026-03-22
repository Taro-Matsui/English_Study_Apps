import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth'
import { getUserSubscription } from '@/lib/subscription'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const subscription = await getUserSubscription(user.id)
  return NextResponse.json(subscription)
}
