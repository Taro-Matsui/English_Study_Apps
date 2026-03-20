'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
export default function AdminJobsRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/library/jobs') }, [router])
  return null
}
