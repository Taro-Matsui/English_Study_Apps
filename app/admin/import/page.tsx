'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
export default function AdminImportRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/library/import') }, [router])
  return null
}
