import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: 'Inter, sans-serif' }}>
      <h1>JCD Watchlist</h1>
      <p>MVP scaffold staat klaar.</p>
      <ul>
        <li><Link href="/dashboard/cars">Dashboard</Link></li>
        <li><Link href="/dashboard/watchlist">Watchlist</Link></li>
        <li><code>GET /api/cars/check</code> voor collector run</li>
      </ul>
    </main>
  )
}
