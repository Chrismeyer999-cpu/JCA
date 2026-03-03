import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) throw new Error('Missing Supabase env vars')

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const { error: e1 } = await db.from('car_listings').delete().not('id', 'is', null)
if (e1) throw e1
const { error: e2 } = await db.from('collector_runs').delete().not('id', 'is', null)
if (e2) throw e2

const [{ count: c1, error: c1e }, { count: c2, error: c2e }] = await Promise.all([
  db.from('car_listings').select('id', { count: 'exact', head: true }),
  db.from('collector_runs').select('id', { count: 'exact', head: true })
])
if (c1e) throw c1e
if (c2e) throw c2e

console.log(JSON.stringify({ ok: true, car_listings: c1 ?? 0, collector_runs: c2 ?? 0 }))
