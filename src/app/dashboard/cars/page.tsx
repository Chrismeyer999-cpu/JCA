import Link from 'next/link'
import { adminClient } from '@/lib/supabase/admin'
import SyncNowButton from '@/components/SyncNowButton'
import DeleteListingButton from '@/components/DeleteListingButton'
import ListingActions from '@/components/ListingActions'
import { calculateLandedPrice } from '@/lib/pricing'

export const dynamic = 'force-dynamic'

const DEFAULT_YEN_RATE = Number(process.env.NEXT_PUBLIC_YEN_RATE ?? '0.0054')

function fmtNum(v: number | null | undefined) {
  if (v === null || v === undefined) return '-'
  return new Intl.NumberFormat('nl-NL').format(v)
}

function fmtEur(v: number | null | undefined) {
  if (v === null || v === undefined) return '-'
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

function absImage(src?: string | null) {
  if (!src) return null
  if (src.startsWith('http')) return src
  if (src.startsWith('/')) return `https://auc.japancardirect.com${src}`
  return `https://auc.japancardirect.com/${src}`
}

function getStartBidYen(p: { start_bid_jpy?: number; start_price_jpy?: number } | null, fallback?: number | null) {
  return p?.start_bid_jpy ?? p?.start_price_jpy ?? fallback ?? null
}

export default async function CarsDashboardPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <main className="mx-auto max-w-5xl p-6 font-sans">
        <h1 className="text-2xl font-bold">JCD Watchlist Dashboard</h1>
        <p className="mt-2 text-slate-600">
          Supabase env vars ontbreken. Voeg ze toe in <code className="rounded bg-slate-100 px-1 py-0.5">.env.local</code> en Vercel.
        </p>
      </main>
    )
  }

  const db = adminClient()

  const [{ data: latest }, { data: runs }, { data: watchlist }] = await Promise.all([
    db
      .from('car_listings')
      .select('id,title,make,model,year,mileage_km,price_jpy,auction_date,url,is_new,last_seen_at,payload,priority_rank')
      .order('priority_rank', { ascending: true, nullsFirst: false })
      .order('auction_date', { ascending: true, nullsFirst: false })
      .order('last_seen_at', { ascending: false })
      .limit(200),
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

  const newCount = rows.filter((x) => x.is_new).length
  const seenCount = rows.length - newCount
  const activeWatch = wl.filter((x) => x.active).length
  const lastRun = runRows[0]

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 py-6 font-sans sm:px-6 lg:px-8">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">JCD Watchlist Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">3x per dag check  new listings highlight  run health</p>
        </div>

        <div className="flex flex-col gap-2 lg:items-end">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link href="/dashboard/watchlist" className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 hover:bg-slate-50">Watchlist beheren</Link>
            <Link href="/dashboard/archive" className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 hover:bg-slate-50">Archive</Link>
            <Link href="/dashboard/calculator" className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 hover:bg-slate-50">Calculator</Link>
            <code className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5">/api/cars/check</code>
          </div>
          <SyncNowButton />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Nieuwe listings', String(newCount)],
          ['Geziene listings', String(seenCount)],
          ['Actieve watch items', String(activeWatch)],
          ['Laatste fetched', lastRun ? String(lastRun.fetched_count) : '-'],
          ['Laatste matched', lastRun ? String(lastRun.matched_count) : '-']
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">{k}</div>
            <div className="text-2xl font-bold text-slate-900">{v}</div>
          </div>
        ))}
      </div>

      <section className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Laatste collector run</h2>
        {lastRun ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
            <div><div className="text-xs text-slate-500">Tijd</div><div className="text-sm">{new Date(lastRun.checked_at).toLocaleString()}</div></div>
            <div><div className="text-xs text-slate-500">Status</div><div className="text-sm">{lastRun.status === 'ok' ? '✅ ok' : '⚠️ fail'}</div></div>
            <div><div className="text-xs text-slate-500">Fetched</div><div className="text-sm">{fmtNum(lastRun.fetched_count)}</div></div>
            <div><div className="text-xs text-slate-500">Matched</div><div className="text-sm">{fmtNum(lastRun.matched_count)}</div></div>
            <div><div className="text-xs text-slate-500">Inserted</div><div className="text-sm">{fmtNum(lastRun.inserted_count)}</div></div>
            <div><div className="text-xs text-slate-500">Updated</div><div className="text-sm">{fmtNum(lastRun.updated_count)}</div></div>
            <div><div className="text-xs text-slate-500">Error</div><div className="text-sm break-words">{lastRun.error_text ?? '-'}</div></div>
          </div>
        ) : <p className="text-sm text-slate-600">Geen runs gevonden.</p>}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-900">Listings</h2>
          <span className="text-sm text-slate-600">Sortering: prioriteit  auction date  recent</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1380px] border-collapse text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="px-2 py-2">Foto</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Model</th><th className="px-2 py-2">Listing</th>
                <th className="px-2 py-2 text-right">Year</th><th className="px-2 py-2 text-right">KM</th><th className="px-2 py-2 text-right">JPY</th><th className="px-2 py-2 text-right">Sold JPY</th>
                <th className="px-2 py-2 text-right">Totaal (startbod)</th>
                <th className="px-2 py-2">Steering</th><th className="px-2 py-2">Auction date</th><th className="px-2 py-2">Prioriteit</th><th className="px-2 py-2">Laatste gezien</th><th className="px-2 py-2">Link</th><th className="px-2 py-2">Actie</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((x, i) => {
                const p = (x.payload as { steering?: string; thumbnail_url?: string; sold_price_jpy?: number; start_bid_jpy?: number; start_price_jpy?: number } | null) ?? {}
                const img = absImage(p.thumbnail_url)
                const startBidYen = getStartBidYen(p, x.price_jpy)
                const totalFromStart = startBidYen
                  ? calculateLandedPrice({ vraagprijsYen: startBidYen, yenRate: DEFAULT_YEN_RATE }).totaalEur
                  : null

                return (
                  <tr key={i} className="border-b border-slate-100 align-top">
                    <td className="px-2 py-2">{img ? <img src={img} alt="car" className="h-14 w-24 rounded-md object-cover" /> : '-'}</td>
                    <td className="px-2 py-2">{x.is_new ? '🟢 new' : '⚪ seen'}</td>
                    <td className="px-2 py-2">{`${x.make ?? ''} ${x.model ?? ''}`.trim() || '-'}</td>
                    <td className="px-2 py-2">{x.title ?? '-'}</td>
                    <td className="px-2 py-2 text-right">{x.year ?? '-'}</td>
                    <td className="px-2 py-2 text-right">{fmtNum(x.mileage_km)}</td>
                    <td className="px-2 py-2 text-right">{fmtNum(x.price_jpy)}</td>
                    <td className="px-2 py-2 text-right">{fmtNum((p.sold_price_jpy as number | null | undefined) ?? null)}</td>
                    <td className="px-2 py-2 text-right">{fmtEur(totalFromStart)}</td>
                    <td className="px-2 py-2">{p.steering ?? '-'}</td>
                    <td className="px-2 py-2">{x.auction_date ? new Date(x.auction_date).toLocaleDateString() : '-'}</td>
                    <td className="px-2 py-2">P{x.priority_rank ?? 3}</td>
                    <td className="px-2 py-2">{x.last_seen_at ? new Date(x.last_seen_at).toLocaleString() : '-'}</td>
                    <td className="px-2 py-2"><Link href={x.url} target="_blank" className="text-blue-700 underline underline-offset-2">open</Link></td>
                    <td className="px-2 py-2"><ListingActions id={x.id} priorityRank={x.priority_rank ?? 3} /><DeleteListingButton id={x.id} /></td>
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
