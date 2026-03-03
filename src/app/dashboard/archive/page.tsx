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
    .select('id,make,model,title,year,mileage_km,price_jpy,url,archived_at')
    .order('archived_at', { ascending: false })
    .limit(300)

  const rows = data ?? []

  return (
    <main style={{ padding: 24, fontFamily: 'Inter, sans-serif', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Archive</h1>
        <Link href="/dashboard/cars">← terug naar Cars</Link>
      </div>
      <p style={{ color: '#666' }}>Verlopen listings die automatisch zijn gearchiveerd.</p>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th align="left">Model</th>
            <th align="left">Title</th>
            <th align="right">Year</th>
            <th align="right">KM</th>
            <th align="right">JPY</th>
            <th align="left">Archived at</th>
            <th align="left">Link</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.id} style={{ borderTop: '1px solid #eee' }}>
              <td>{`${x.make ?? ''} ${x.model ?? ''}`.trim()}</td>
              <td>{x.title ?? '—'}</td>
              <td align="right">{x.year ?? '—'}</td>
              <td align="right">{fmtNum(x.mileage_km)}</td>
              <td align="right">{fmtNum(x.price_jpy)}</td>
              <td>{x.archived_at ? new Date(x.archived_at).toLocaleString() : '—'}</td>
              <td><Link href={x.url} target="_blank">open</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
