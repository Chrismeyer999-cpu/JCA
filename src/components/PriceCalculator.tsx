'use client'

import { useMemo, useState } from 'react'
import { calculateLandedPrice } from '@/lib/pricing'

const fmt = (n: number) => new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

export default function PriceCalculator() {
  const [yen, setYen] = useState('4080000')
  const [rate, setRate] = useState('0.0054')
  const [keuring, setKeuring] = useState('1088')
  const [repairs, setRepairs] = useState('0')

  const result = useMemo(() => {
    return calculateLandedPrice({
      vraagprijsYen: Number(yen || 0),
      yenRate: Number(rate || 0),
      keuringEur: Number(keuring || 0),
      repairsEur: Number(repairs || 0)
    })
  }, [yen, rate, keuring, repairs])

  return (
    <section style={{ border: '1px solid #ddd', borderRadius: 10, padding: 12, background: '#fff', marginBottom: 16 }}>
      <h2 style={{ marginTop: 0 }}>Rekenmodule eindprijs</h2>
      <p style={{ color: '#666', marginTop: 0 }}>Logica uit je Excel: boven 1M yen andere fee dan op/onder 1M yen.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(160px,1fr))', gap: 8, marginBottom: 12 }}>
        <input value={yen} onChange={(e) => setYen(e.target.value)} placeholder="Vraagprijs (yen)" />
        <input value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Yen koers" />
        <input value={keuring} onChange={(e) => setKeuring(e.target.value)} placeholder="Keuring €" />
        <input value={repairs} onChange={(e) => setRepairs(e.target.value)} placeholder="Repairs / onvoorzien €" />
      </div>

      <div style={{ fontSize: 14, marginBottom: 8 }}>
        Fee mode: <b>{result.mode === 'above_1m_yen' ? '> 1.000.000 yen' : '≤ 1.000.000 yen'}</b>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr><td>Aankoop (yen * koers)</td><td align="right">{fmt(result.aankoopEur)}</td></tr>
          <tr><td>Fee</td><td align="right">{fmt(result.feeEur)}</td></tr>
          <tr><td>Subtotaal</td><td align="right">{fmt(result.subtotaalEur)}</td></tr>
          <tr><td>+10%</td><td align="right">{fmt(result.plus10Eur)}</td></tr>
          <tr><td>+21% btw</td><td align="right">{fmt(result.btw21Eur)}</td></tr>
          <tr><td>+ keuring</td><td align="right">{fmt(result.keuringEur)}</td></tr>
          <tr style={{ borderTop: '1px solid #ddd', fontWeight: 700 }}><td>Totaal</td><td align="right">{fmt(result.totaalEur)}</td></tr>
          <tr><td>+ repairs/onvoorzien</td><td align="right">{fmt(result.repairsEur)}</td></tr>
          <tr style={{ borderTop: '1px solid #ddd', fontWeight: 700 }}><td>Totaal incl. repairs</td><td align="right">{fmt(result.totaalMetRepairsEur)}</td></tr>
        </tbody>
      </table>
    </section>
  )
}
