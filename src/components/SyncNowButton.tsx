'use client'

import { useState, useTransition } from 'react'

export default function SyncNowButton() {
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState('')

  const runSync = () => {
    startTransition(async () => {
      setMsg('')
      try {
        const headers: Record<string, string> = {}
        const secret = (window as unknown as { __CRON_SECRET__?: string }).__CRON_SECRET__
        if (secret) headers.Authorization = `Bearer ${secret}`

        const res = await fetch('/api/cars/check?manual=1', { method: 'GET', headers })
        const json = await res.json().catch(() => ({}))
        if (!res.ok || json?.ok === false) {
          setMsg(`❌ Sync mislukt: ${json?.error ?? res.status}`)
          return
        }
        setMsg(`✅ Sync klaar — fetched ${json.fetched}, matched ${json.matched}, inserted ${json.inserted}, updated ${json.updated}`)
      } catch {
        setMsg('❌ Netwerkfout bij sync')
      }
    })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button onClick={runSync} disabled={isPending}>
        {isPending ? 'Syncen…' : '🔄 Sync nu'}
      </button>
      {msg ? <span style={{ fontSize: 13 }}>{msg}</span> : null}
    </div>
  )
}
