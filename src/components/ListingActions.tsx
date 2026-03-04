'use client'

import { useState, useTransition } from 'react'

type Props = {
  id: string
  priorityRank: number | null
}

export default function ListingActions({ id, priorityRank }: Props) {
  const [isPending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const updatePriority = (val: string) => {
    const parsed = Number(val)
    startTransition(async () => {
      setErr(null)
      const res = await fetch(`/api/cars/listings/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ priority_rank: parsed })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.ok === false) {
        setErr(json?.error ?? 'Prioriteit opslaan mislukt')
        return
      }
      window.location.reload()
    })
  }

  const onArchive = () => {
    if (!confirm('Deze listing naar archief verplaatsen?')) return
    startTransition(async () => {
      setErr(null)
      const res = await fetch(`/api/cars/listings/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ archive: true })
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.ok === false) {
        setErr(json?.error ?? 'Archiveren mislukt')
        return
      }
      window.location.reload()
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <select
        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
        defaultValue={String(priorityRank ?? 3)}
        onChange={(e) => updatePriority(e.target.value)}
        disabled={isPending}
      >
        <option value="1">Prioriteit 1 (eerst)</option>
        <option value="2">Prioriteit 2</option>
        <option value="3">Prioriteit 3</option>
        <option value="4">Prioriteit 4</option>
        <option value="5">Prioriteit 5</option>
      </select>

      <button
        onClick={onArchive}
        disabled={isPending}
        className="rounded border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900 hover:bg-amber-100 disabled:opacity-60"
      >
        {isPending ? '…' : 'Archive'}
      </button>

      {err ? <span className="text-xs text-red-700">{err}</span> : null}
    </div>
  )
}
