export type Watchlist = {
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

export type ParsedListingMeta = {
  transmission?: 'manual' | 'automatic' | 'unknown'
  engine_cc?: number
}

export type ListingInput = {
  source_listing_id?: string
  url: string
  make?: string
  model?: string
  title?: string
  year?: number
  mileage_km?: number
  price_jpy?: number
  auction_house?: string
  auction_date?: string
  payload?: Record<string, unknown>
}
