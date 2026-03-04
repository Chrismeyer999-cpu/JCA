import * as cheerio from 'cheerio'
import { adminClient } from './supabase/admin'
import type { ListingInput, ParsedListingMeta, Watchlist } from './types'

const BASE = 'https://auc.japancardirect.com'

function toAbs(url: string) {
  if (!url) return BASE
  if (url.startsWith('http')) return url
  if (url.startsWith('/')) return `${BASE}${url}`
  return `${BASE}/${url}`
}

async function fetchHtml(url: string, cookie?: string) {
  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      ...(cookie ? { cookie } : {})
    },
    cache: 'no-store'
  })
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`)
  return await res.text()
}

function parseMeta(text: string): ParsedListingMeta {
  const t = text.toLowerCase()
  const ccMatch = t.match(/\b(\d{3,4})\s*cc\b/i)
  const transmission = /\b(mt|manual|\dmt|\df\d?|f5|f6)\b/i.test(t)
    ? 'manual'
    : /\b(at|automatic|cvt|dct)\b/i.test(t)
      ? 'automatic'
      : 'unknown'

  return {
    transmission,
    engine_cc: ccMatch ? Number(ccMatch[1]) : undefined
  }
}

function parseSearchResults(html: string): ListingInput[] {
  const $ = cheerio.load(html)
  const out: ListingInput[] = []
  const seen = new Set<string>()

  const hrefLooksLikeListing = (href: string) =>
    /aj[-_][^\s"'`]+\.htm/i.test(href) || /\/aj[-_][^\s"'`]+/i.test(href)

  const extractHref = (raw: string) => {
    if (!raw) return null
    const direct = raw.trim()
    if (hrefLooksLikeListing(direct)) return direct

    const m = direct.match(/['"]([^'"]*aj[-_][^'"`\s]+\.htm[^'"]*)['"]/i)
    if (m?.[1]) return m[1]

    const m2 = direct.match(/(\/[^\s'"`]*aj[-_][^\s'"`]+\.htm[^\s'"`]*)/i)
    if (m2?.[1]) return m2[1]

    return null
  }

  const parseRow = (href: string, rowText: string) => {
    const t = rowText.replace(/\s+/g, ' ').trim()
    if (!t) return

    const yearMatch = t.match(/\b(19\d{2}|20\d{2})\b/)
    const kmMatch = t.match(/(\d{1,3}(?:[ ,]\d{3})*)\s*km/i)
    const yenMatches = [...t.matchAll(/(\d{1,3}(?:[ ,]\d{3})*)\s*(?:¥|JPY|円)/gi)]

    const url = toAbs(href)
    if (seen.has(url)) return
    seen.add(url)

    const meta = parseMeta(t)

    out.push({
      source_listing_id: href,
      url,
      title: t.slice(0, 240),
      year: yearMatch ? Number(yearMatch[1]) : undefined,
      mileage_km: kmMatch ? Number(kmMatch[1].replace(/[ ,]/g, '')) : undefined,
      price_jpy: yenMatches.length > 0 ? Number(String(yenMatches[yenMatches.length - 1][1]).replace(/[ ,]/g, '')) : undefined,
      payload: { row_text: t, ...meta }
    })
  }

  $('a, [onclick], [data-href]').each((_i, el) => {
    const rawHref =
      String($(el).attr('href') || '') ||
      String($(el).attr('data-href') || '') ||
      String($(el).attr('onclick') || '')

    const href = extractHref(rawHref)
    if (!href) return

    const row = $(el).closest('tr')
    const rowText = row.length ? row.text() : $(el).parent().text()
    parseRow(href, rowText)
  })

  if (out.length === 0) {
    const fallback = [...html.matchAll(/(?:href|location\.href|open\()\s*[=\(]?\s*['"]([^'"]*aj[-_][^'"`\s]+\.htm[^'"]*)['"]/gi)]
    for (const m of fallback) {
      const href = m[1]
      if (!href) continue
      parseRow(href, html)
    }
  }

  return out
}

async function collectFromJapanCarDirect(watchlist: Watchlist[]): Promise<{ items: ListingInput[]; errors: string[] }> {
  const cookie = process.env.JCD_COOKIE
  const all: ListingInput[] = []
  const errors: string[] = []

  for (const w of watchlist) {
    if (!w.search_url) continue
    try {
      const html = await fetchHtml(w.search_url, cookie)
      const parsed = parseSearchResults(html)
      all.push(...parsed)
      await new Promise((r) => setTimeout(r, 900))
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown fetch error'
      errors.push(`${w.search_url}: ${msg}`)
    }
  }

  return { items: all, errors }
}

function escRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasToken(text: string, token: string) {
  if (!token.trim()) return true
  const p = `(^|[^a-z0-9])${escRegex(token.toLowerCase())}([^a-z0-9]|$)`
  return new RegExp(p, 'i').test(text)
}

function hasModelPhrase(text: string, model: string) {
  const parts = model.toLowerCase().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return true

  if (parts.length === 1 && parts[0].length <= 3) return hasToken(text, parts[0])

  return parts.every((p) => hasToken(text, p))
}

function matchesWatchlist(item: ListingInput, w: Watchlist) {
  const text = `${item.make ?? ''} ${item.model ?? ''} ${item.title ?? ''}`.toLowerCase()

  const makeOk = hasToken(text, w.make)
  const modelOk = hasModelPhrase(text, w.model)
  const kwOk = w.keywords.length === 0 || w.keywords.some((k) => hasToken(text, k))

  const yearOk = (!w.min_year || !item.year || item.year >= w.min_year) &&
    (!w.max_year || !item.year || item.year <= w.max_year)

  const kmOk = !w.max_km || !item.mileage_km || item.mileage_km <= w.max_km
  const priceOk = !w.max_price_jpy || !item.price_jpy || item.price_jpy <= w.max_price_jpy

  const meta = (item.payload ?? {}) as { transmission?: string; engine_cc?: number }
  const transmissionOk =
    !w.transmission || w.transmission === 'any' || meta.transmission === w.transmission

  const engineMinOk = !w.min_engine_cc || !meta.engine_cc || meta.engine_cc >= w.min_engine_cc
  const engineMaxOk = !w.max_engine_cc || !meta.engine_cc || meta.engine_cc <= w.max_engine_cc

  return makeOk && modelOk && kwOk && yearOk && kmOk && priceOk && transmissionOk && engineMinOk && engineMaxOk
}

export async function runCollector() {
  const db = adminClient()
  const { data: watchlist, error: watchErr } = await db.from('watchlist').select('*').eq('active', true)
  if (watchErr) throw watchErr

  const wl = (watchlist ?? []) as Watchlist[]
  const { items, errors } = await collectFromJapanCarDirect(wl)

  let matched = 0
  let inserted = 0
  let updated = 0

  for (const item of items) {
    const matchedWatch = wl.find((w) => matchesWatchlist(item, w))
    if (!matchedWatch) continue

    matched += 1

    const sourceId = item.source_listing_id ?? item.url
    const { data: existing } = await db
      .from('car_listings')
      .select('id')
      .eq('source', 'auc.japancardirect.com')
      .or(`source_listing_id.eq.${sourceId},url.eq.${item.url}`)
      .maybeSingle()

    const nextPayload = {
      ...(item.payload ?? {}),
      _matched_make: matchedWatch.make,
      _matched_model: matchedWatch.model
    }

    if (existing?.id) {
      const { error } = await db
        .from('car_listings')
        .update({
          ...item,
          make: matchedWatch.make,
          model: matchedWatch.model,
          watchlist_id: matchedWatch.id,
          is_new: false,
          last_seen_at: new Date().toISOString(),
          payload: nextPayload
        })
        .eq('id', existing.id)
      if (!error) updated += 1
    } else {
      const { error } = await db.from('car_listings').insert({
        ...item,
        source: 'auc.japancardirect.com',
        source_listing_id: item.source_listing_id ?? null,
        make: matchedWatch.make,
        model: matchedWatch.model,
        watchlist_id: matchedWatch.id,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        is_new: true,
        payload: nextPayload
      })
      if (!error) inserted += 1
    }
  }

  await db.from('collector_runs').insert({
    status: errors.length > 0 && items.length === 0 ? 'fail' : 'ok',
    fetched_count: items.length,
    matched_count: matched,
    inserted_count: inserted,
    updated_count: updated,
    error_text: errors.length ? errors.slice(0, 5).join(' | ') : null
  })

  return { fetched: items.length, matched, inserted, updated, errors }
}
