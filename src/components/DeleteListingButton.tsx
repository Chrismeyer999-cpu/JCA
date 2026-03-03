'use client'

import { useState, useTransition } from 'react'

export default function DeleteListingButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const onDelete = () => {
    if (!confirm('Deze listing verwijderen uit actieve lijst?')) return
    startTransition(async () => {
      setErr(null)
      const res = await fetch(`/api/cars/listings/${id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.ok === false) {
        setErr(json?.error ?? 'Delete mislukt')
        return
      }
      window.location.reload()
    })
  }

  return (
    <>
      <button onClick={onDelete} disabled={isPending}>{isPending ? '…' : 'Delete'}</button>
      {err ? <span style={{ color: '#b00', marginLeft: 6 }}>{err}</span> : null}
    </>
  )
}
