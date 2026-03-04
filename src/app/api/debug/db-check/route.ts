import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function hostFromUrl(url?: string) {
  if (!url) return null
  try {
    return new URL(url).host
  } catch {
    return null
  }
}

export async function GET() {
  const db = adminClient()

  const [listings, runs] = await Promise.all([
    db.from('car_listings').select('*', { count: 'exact', head: true }),
    db.from('collector_runs').select('checked_at,fetched_count,matched_count,inserted_count,updated_count,error_text').order('checked_at', { ascending: false }).limit(1)
  ])

  return NextResponse.json({
    ok: true,
    supabaseHost: hostFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    listingsCount: listings.count ?? null,
    latestRun: runs.data?.[0] ?? null,
    listingsError: listings.error?.message ?? null,
    runsError: runs.error?.message ?? null
  })
}
