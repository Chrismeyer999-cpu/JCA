export type PriceInput = {
  vraagprijsYen: number
  yenRate: number
  keuringEur?: number
  repairsEur?: number
}

export type PriceBreakdown = {
  mode: 'above_1m_yen' | 'up_to_1m_yen'
  aankoopEur: number
  feeEur: number
  subtotaalEur: number
  plus10Eur: number
  btw21Eur: number
  keuringEur: number
  totaalEur: number
  repairsEur: number
  totaalMetRepairsEur: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function calculateLandedPrice(input: PriceInput): PriceBreakdown {
  const keuring = input.keuringEur ?? 1088
  const repairs = input.repairsEur ?? 0

  const aankoop = input.vraagprijsYen * input.yenRate
  const mode: PriceBreakdown['mode'] = input.vraagprijsYen > 1_000_000 ? 'above_1m_yen' : 'up_to_1m_yen'

  // Excel: >1m => 3800 + 4% van aankoop, <=1m => 3800
  const fee = mode === 'above_1m_yen' ? 3800 + 0.04 * aankoop : 3800

  const subtotaal = aankoop + fee
  const plus10 = subtotaal * 1.1
  const btw21 = plus10 * 1.21
  const totaal = btw21 + keuring
  const totaalMetRepairs = totaal + repairs

  return {
    mode,
    aankoopEur: round2(aankoop),
    feeEur: round2(fee),
    subtotaalEur: round2(subtotaal),
    plus10Eur: round2(plus10),
    btw21Eur: round2(btw21),
    keuringEur: round2(keuring),
    totaalEur: round2(totaal),
    repairsEur: round2(repairs),
    totaalMetRepairsEur: round2(totaalMetRepairs)
  }
}
