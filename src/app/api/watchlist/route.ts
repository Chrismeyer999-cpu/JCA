import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { adminClient } from '@/lib/supabase/admin'

const schema = z.object({
  active: z.boolean().optional().default(true),
  make: z.string().min(1),
  model: z.string().min(1),
  keywords: z.array(z.string()).optional().default([]),
  search_url: z.string().url().nullable().optional(),
  min_year: z.number().int().nullable().optional(),
  max_year: z.number().int().nullable().optional(),
  transmission: z.enum(['any', 'manual', 'automatic']).optional().default('any'),
  min_engine_cc: z.number().int().nullable().optional(),
  max_engine_cc: z.number().int().nullable().optional(),
  max_price_jpy: z.number().int().nullable().optional(),
  max_km: z.number().int().nullable().optional()
})

export async function GET() {
  const db = adminClient()
  const { data, error } = await db.from('watchlist').select('*').order('created_at', { ascending: false })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, items: data })
}

export async function POST(req: NextRequest) {
  try {
    const input = schema.parse(await req.json())
    const db = adminClient()
    const { data, error } = await db.from('watchlist').insert(input).select('*').single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, item: data })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'Invalid body' }, { status: 400 })
  }
}
