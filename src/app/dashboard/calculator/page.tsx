import Link from 'next/link'
import PriceCalculator from '@/components/PriceCalculator'

export default function CalculatorPage() {
  return (
    <main style={{ padding: 24, fontFamily: 'Inter, sans-serif', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Prijs Calculator</h1>
        <Link href="/dashboard/cars">← terug naar Cars</Link>
      </div>
      <PriceCalculator />
    </main>
  )
}
