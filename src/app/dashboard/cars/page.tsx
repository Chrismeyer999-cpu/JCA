import Link from 'next/link'
import { adminClient } from '@/lib/supabase/admin'
import SyncNowButton from '@/components/SyncNowButton'
import PriceCalculator from '@/components/PriceCalculator'
import DeleteListingButton from '@/components/DeleteListingButton'

export const dynamic = 'force-dynamic'

function fmtNum(v: number | null | undefined) {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('nl-NL').format(v)
}

function absImage(src?: string | null) {
  if (!src) return null
  if (src.startsWith('http')) return src
  if (src.startsWith('/')) return `https://auc.japancardirect.com${src}`
  return `https://auc.japancardirect.com/${src}`
}

export default async function CarsDashboardPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <main style={{ padding: 24, fontFamily: 'Inter, sans-serif' }}>
        <h1>JCD Watchlist Dashboard</h1>
        <p>Supabase env vars ontbreken. Voeg ze toe in <code>.env.local</code> en Vercel.</p>
      </main>
    )
  }

  const db = adminClient()

  const [{ data: latest }, { data: runs }, { data: watchlist }] = await Promise.all([
    db
      .from('car_listings')
      .select('id,title,make,model,year,mileage_km,price_jpy,auction_date,url,is_new,last_seen_at,payload')
      .order('last_seen_at', { ascending: false })
      .limit(100),
    db
      .from('collector_runs')
      .select('checked_at,status,fetched_count,matched_count,inserted_count,updated_count,error_text')
      .order('checked_at', { ascending: false })
      .limit(10),
    db.from('watchlist').select('id,active')
  ])

  const rows = latest ?? []
  const runRows = runs ?? []
  const wl = watchlist ?? []

  // Auto-hide verlopen items: toon alleen listings gezien in laatste 36 uur.
  const activeRows = rows.filter((x) => {
    if (!x.last_seen_at) return false
    return Date.now() - new Date(x.last_seen_at).getTime() < 36 * 60 * 60 * 1000
  })

  const newCount = activeRows.filter((x) => x.is_new).length
  const seenCount = activeRows.length - newCount
  const activeWatch = wl.filter((x) => x.active).length
  const lastRun = runRows[0]

  return (
    <main style={{ padding: 24, fontFamily: 'Inter, sans-serif', maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>JCD Watchlist Dashboard</h1>
          <p style={{ margin: '6px 0 0', color: '#666' }}>3x per dag check • new listings highlight • run health</p>
        </div>
        <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/dashboard/watchlist">Watchlist beheren</Link>
            <span>•</span>
            <Link href="/dashboard/archive">Archive</Link>
            <span>•</span>
            <code>/api/cars/check</code>
          </div>
          <SyncNowButton />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(140px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          ['Nieuwe listings', String(newCount)],
          ['Geziene listings', String(seenCount)],
          ['Actieve watch items', String(activeWatch)],
          ['Laatste fetched', lastRun ? String(lastRun.fetched_count) : '—'],
          ['Laatste matched', lastRun ? String(lastRun.matched_count) : '—']
        ].map(([k, v]) => (
          <div key={k} style={{ border: '1px solid #ddd', borderRadius: 10, padding: 12, background: '#fff' }}>
            <div style={{ fontSize: 12, color: '#666' }}>{k}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{v}</div>
          </div>
        ))}
      </div>

      <PriceCalculator />

      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 12, marginBottom: 16, background: '#fff' }}>
        <h2 style={{ marginTop: 0 }}>Laatste collector runs</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th align="left">Tijd</th><th align="left">Status</th><th align="right">Fetched</th><th align="right">Matched</th><th align="right">Inserted</th><th align="right">Updated</th><th align="left">Error</th>
              </tr>
            </thead>
            <tbody>
              {runRows.map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid #eee' }}>
                  <td>{new Date(r.checked_at).toLocaleString()}</td>
                  <td>{r.status === 'ok' ? '✅ ok' : '⚠️ fail'}</td>
                  <td align="right">{fmtNum(r.fetched_count)}</td>
                  <td align="right">{fmtNum(r.matched_count)}</td>
                  <td align="right">{fmtNum(r.inserted_count)}</td>
                  <td align="right">{fmtNum(r.updated_count)}</td>
                  <td>{r.error_text ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 12, background: '#fff' }}>
        <h2 style={{ marginTop: 0 }}>Listings</h2>
        <p style={{ marginTop: 0, color: '#666' }}>Verlopen items worden automatisch verborgen als ze {'>'}36 uur niet meer gezien zijn.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th align="left">Foto</th>
                <th align="left">Status</th>
                <th align="left">Model</th>
                <th align="left">Listing</th>
                <th align="right">Year</th>
                <th align="right">KM</th>
                <th align="right">JPY</th>
                <th align="right">Sold JPY</th>
                <th align="left">Steering</th>
                <th align="left">Auction date</th>
                <th align="left">Laatste gezien</th>
                <th align="left">Link</th>
                <th align="left">Actie</th>
              </tr>
            </thead>
            <tbody>
              {activeRows.map((x, i) => {
                const p = (x.payload as { steering?: string; thumbnail_url?: string; sold_price_jpy?: number } | null) ?? {}
                const img = absImage(p.thumbnail_url)
                return (
                  <tr key={i} style={{ borderTop: '1px solid #eee' }}>
                    <td>{img ? <img src={img} alt="car" style={{ width: 96, height: 54, objectFit: 'cover', borderRadius: 6 }} /> : '—'}</td>
                    <td>{x.is_new ? '🟢 new' : '⚪ seen'}</td>
                    <td>{`${x.make ?? ''} ${x.model ?? ''}`.trim() || '—'}</td>
                    <td>{x.title ?? '—'}</td>
                    <td align="right">{x.year ?? '—'}</td>
                    <td align="right">{fmtNum(x.mileage_km)}</td>
                    <td align="right">{fmtNum(x.price_jpy)}</td>
                    <td align="right">{fmtNum((p.sold_price_jpy as number | null | undefined) ?? null)}</td>
                    <td>{p.steering ?? '—'}</td>
                    <td>{x.auction_date ?? '—'}</td>
                    <td>{x.last_seen_at ? new Date(x.last_seen_at).toLocaleString() : '—'}</td>
                    <td><Link href={x.url} target="_blank">open</Link></td>
                    <td><DeleteListingButton id={x.id} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
