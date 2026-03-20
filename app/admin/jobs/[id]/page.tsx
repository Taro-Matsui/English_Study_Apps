'use client'
import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
export default function AdminJobDetailRedirect() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  useEffect(() => { router.replace(`/library/jobs/${id}`) }, [router, id])
  return null
}
