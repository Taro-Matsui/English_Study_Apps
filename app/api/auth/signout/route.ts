import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { cookies } from 'next/headers'

export async function POST() {
  const supabase = createSupabaseServerClient(cookies())
  await supabase.auth.signOut()
  return NextResponse.json({ success: true })
}
