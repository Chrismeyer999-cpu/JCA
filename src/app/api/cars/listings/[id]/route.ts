import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

async function archiveById(id: string) {
  const db = adminClient()
  const { data: row, error: readErr } = await db.from('car_listings').select('*').eq('id', id).maybeSingle()
  if (readErr) throw new Error(readErr.message)
  if (!row) return { ok: false, error: 'Listing niet gevonden' }

  const { error: insErr } = await db
    .from('car_listings_archive')
    .insert({ ...row, archived_at: new Date().toISOString() })

  if (insErr) throw new Error(insErr.message)

  const { error: delErr } = await db.from('car_listings').delete().eq('id', id)
  if (delErr) throw new Error(delErr.message)

  return { ok: true }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = adminClient()

  const { error } = await db.from('car_listings').delete().eq('id', id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let body: { priority_rank?: number | null; archive?: boolean } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  if (body.archive) {
    try {
      const res = await archiveById(id)
      if (!res.ok) return NextResponse.json(res, { status: 404 })
      return NextResponse.json({ ok: true, archived: true })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Archive mislukt'
      return NextResponse.json({ ok: false, error: msg }, { status: 500 })
    }
  }

  if (body.priority_rank !== undefined) {
    const db = adminClient()
    const pr = body.priority_rank
    const val = pr === null ? null : Math.max(1, Math.min(99, Number(pr)))

    const { error } = await db.from('car_listings').update({ priority_rank: val }).eq('id', id)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, priority_rank: val })
  }

  return NextResponse.json({ ok: false, error: 'Geen geldige actie' }, { status: 400 })
}
