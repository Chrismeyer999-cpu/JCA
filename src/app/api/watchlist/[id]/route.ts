import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/admin'

const patchSchema = z.object({
  active: z.boolean().optional(),
  make: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  keywords: z.array(z.string()).optional(),
  search_url: z.string().url().nullable().optional(),
  min_year: z.number().int().nullable().optional(),
  max_year: z.number().int().nullable().optional(),
  transmission: z.enum(['any', 'manual', 'automatic']).optional(),
  min_engine_cc: z.number().int().nullable().optional(),
  max_engine_cc: z.number().int().nullable().optional(),
  max_price_jpy: z.number().int().nullable().optional(),
  max_km: z.number().int().nullable().optional()
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const input = patchSchema.parse(await req.json())
    const db = adminClient()
    const { data, error } = await db.from('watchlist').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).select('*').single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, item: data })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Invalid body' }, { status: 400 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = adminClient()
  const { error } = await db.from('watchlist').delete().eq('id', id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
