'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Item = {
  id: string
  active: boolean
  make: string
  model: string
  keywords: string[]
  search_url?: string | null
  min_year: number | null
  max_year?: number | null
  transmission?: 'any' | 'manual' | 'automatic'
  min_engine_cc?: number | null
  max_engine_cc?: number | null
  max_price_jpy: number | null
  max_km: number | null
}

const emptyForm = {
  make: 'BMW',
  model: 'M3',
  keywords: '',
  search_url: '',
  min_year: '',
  max_year: '',
  transmission: 'any',
  min_engine_cc: '',
  max_engine_cc: '',
  max_price_jpy: '',
  max_km: ''
}

export default function WatchlistPage() {
  const [items, setItems] = useState<Item[]>([])
  const [form, setForm] = useState(emptyForm)
  const [msg, setMsg] = useState('')

  const stats = useMemo(() => {
    const active = items.filter((x) => x.active).length
    const withUrl = items.filter((x) => !!x.search_url).length
    return { total: items.length, active, paused: items.length - active, withUrl }
  }, [items])

  const load = async () => {
    const res = await fetch('/api/watchlist')
    const json = await res.json()
    if (json.ok) setItems(json.items)
  }

  useEffect(() => {
    load()
  }, [])

  const add = async () => {
    setMsg('')
    const payload = {
      make: form.make,
      model: form.model,
      keywords: form.keywords.split(',').map((x) => x.trim()).filter(Boolean),
      search_url: form.search_url ? form.search_url : null,
      min_year: form.min_year ? Number(form.min_year) : null,
      max_year: form.max_year ? Number(form.max_year) : null,
      transmission: form.transmission,
      min_engine_cc: form.min_engine_cc ? Number(form.min_engine_cc) : null,
      max_engine_cc: form.max_engine_cc ? Number(form.max_engine_cc) : null,
      max_price_jpy: form.max_price_jpy ? Number(form.max_price_jpy) : null,
      max_km: form.max_km ? Number(form.max_km) : null
    }
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const json = await res.json()
    if (!json.ok) return setMsg(json.error || 'Add failed')
    setForm(emptyForm)
    setMsg('✅ Watch item toegevoegd')
    await load()
  }

  const toggle = async (id: string, active: boolean) => {
    await fetch(`/api/watchlist/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active })
    })
    await load()
  }

  const remove = async (id: string) => {
    await fetch(`/api/watchlist/${id}`, { method: 'DELETE' })
    await load()
  }

  return (
    <main style={{ padding: 24, fontFamily: 'Inter, sans-serif', maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0 }}>Watchlist</h1>
          <p style={{ margin: '6px 0 0', color: '#666' }}>Beheer modellen die 3x per dag gecheckt worden.</p>
        </div>
        <Link href="/dashboard/cars">← Naar Cars dashboard</Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(140px,1fr))', gap: 10, marginBottom: 16 }}>
        {[
          ['Totaal', String(stats.total)],
          ['Actief', String(stats.active)],
          ['Gepauzeerd', String(stats.paused)],
          ['Met search URL', String(stats.withUrl)]
        ].map(([k, v]) => (
          <div key={k} style={{ border: '1px solid #ddd', borderRadius: 10, padding: 12, background: '#fff' }}>
            <div style={{ fontSize: 12, color: '#666' }}>{k}</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{v}</div>
          </div>
        ))}
      </div>

      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 12, marginBottom: 16, background: '#fff' }}>
        <h2 style={{ marginTop: 0 }}>Nieuw watch item</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(180px,1fr))', gap: 8 }}>
          <input placeholder="Make (bv BMW)" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
          <input placeholder="Model (bv M3)" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
          <input placeholder="Keywords (comma)" value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} />
          <input placeholder="JCD search URL (aanrader)" value={form.search_url} onChange={(e) => setForm({ ...form, search_url: e.target.value })} />

          <input placeholder="Min year" value={form.min_year} onChange={(e) => setForm({ ...form, min_year: e.target.value })} />
          <input placeholder="Max year" value={form.max_year} onChange={(e) => setForm({ ...form, max_year: e.target.value })} />
          <select value={form.transmission} onChange={(e) => setForm({ ...form, transmission: e.target.value as 'any' | 'manual' | 'automatic' })}>
            <option value="any">Transmissie: any</option>
            <option value="manual">Manual</option>
            <option value="automatic">Automatic</option>
          </select>
          <input placeholder="Min engine cc" value={form.min_engine_cc} onChange={(e) => setForm({ ...form, min_engine_cc: e.target.value })} />

          <input placeholder="Max engine cc" value={form.max_engine_cc} onChange={(e) => setForm({ ...form, max_engine_cc: e.target.value })} />
          <input placeholder="Max JPY" value={form.max_price_jpy} onChange={(e) => setForm({ ...form, max_price_jpy: e.target.value })} />
          <input placeholder="Max KM" value={form.max_km} onChange={(e) => setForm({ ...form, max_km: e.target.value })} />
        </div>
        <button onClick={add} style={{ marginTop: 10 }}>Add watch item</button>
        {msg ? <p>{msg}</p> : null}
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 12, background: '#fff' }}>
        <h2 style={{ marginTop: 0 }}>Huidige items</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th align="left">Status</th><th align="left">Make</th><th align="left">Model</th><th align="left">URL</th><th align="left">Keywords</th>
                <th align="right">Year min-max</th><th align="left">Trans</th><th align="right">CC min-max</th><th align="right">Max JPY</th><th align="right">Max KM</th><th align="left">Acties</th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id} style={{ borderTop: '1px solid #eee' }}>
                  <td>{x.active ? '✅ active' : '⏸️ paused'}</td>
                  <td>{x.make}</td><td>{x.model}</td><td>{x.search_url ? '✅' : '—'}</td><td>{x.keywords.join(', ') || '—'}</td>
                  <td align="right">{`${x.min_year ?? '—'} - ${x.max_year ?? '—'}`}</td>
                  <td>{x.transmission ?? 'any'}</td>
                  <td align="right">{`${x.min_engine_cc ?? '—'} - ${x.max_engine_cc ?? '—'}`}</td>
                  <td align="right">{x.max_price_jpy ?? '—'}</td><td align="right">{x.max_km ?? '—'}</td>
                  <td>
                    <button onClick={() => toggle(x.id, !x.active)}>{x.active ? 'Pause' : 'Activate'}</button>{' '}
                    <button onClick={() => remove(x.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
