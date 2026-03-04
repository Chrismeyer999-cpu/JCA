import Link from 'next/link'
import { adminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

function fmtNum(v: number | null | undefined) {
  if (v === null || v === undefined) return '—'
  return new Intl.NumberFormat('nl-NL').format(v)
}

export default async function ArchivePage() {
  const db = adminClient()
  const { data } = await db
    .from('car_listings_archive')
    .select('id,make,model,title,year,mileage_km,price_jpy,url,auction_date,priority_rank,archived_at')
    .order('archived_at', { ascending: false })
    .limit(300)

  const rows = data ?? []

  return (
    <main className="mx-auto w-full max-w-[1300px] px-4 py-6 font-sans sm:px-6 lg:px-8">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Archive</h1>
        <Link href="/dashboard/cars" className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm hover:bg-slate-50">← terug naar Cars</Link>
      </div>
      <p className="mb-3 text-sm text-slate-600">Geveilde of handmatig gearchiveerde listings.</p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-2">
        <table className="w-full min-w-[1000px] border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              <th className="px-2 py-2">Model</th>
              <th className="px-2 py-2">Title</th>
              <th className="px-2 py-2 text-right">Year</th>
              <th className="px-2 py-2 text-right">KM</th>
              <th className="px-2 py-2 text-right">JPY</th>
              <th className="px-2 py-2">Auction date</th>
              <th className="px-2 py-2">Prioriteit</th>
              <th className="px-2 py-2">Archived at</th>
              <th className="px-2 py-2">Link</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id} className="border-b border-slate-100">
                <td className="px-2 py-2">{`${x.make ?? ''} ${x.model ?? ''}`.trim() || '—'}</td>
                <td className="px-2 py-2">{x.title ?? '—'}</td>
                <td className="px-2 py-2 text-right">{x.year ?? '—'}</td>
                <td className="px-2 py-2 text-right">{fmtNum(x.mileage_km)}</td>
                <td className="px-2 py-2 text-right">{fmtNum(x.price_jpy)}</td>
                <td className="px-2 py-2">{x.auction_date ? new Date(x.auction_date).toLocaleDateString() : '—'}</td>
                <td className="px-2 py-2">P{x.priority_rank ?? '—'}</td>
                <td className="px-2 py-2">{x.archived_at ? new Date(x.archived_at).toLocaleString() : '—'}</td>
                <td className="px-2 py-2"><Link href={x.url} target="_blank" className="text-blue-700 underline underline-offset-2">open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
