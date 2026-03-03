#!/usr/bin/env node
import dotenv from 'dotenv'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const JCD_USERNAME = process.env.JCD_USERNAME
const JCD_PASSWORD = process.env.JCD_PASSWORD

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env vars')
  process.exit(1)
}
if (!JCD_USERNAME || !JCD_PASSWORD) {
  console.error('Missing JCD_USERNAME / JCD_PASSWORD')
  process.exit(1)
}

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
})

function parseRowText(t, imageUrl = null) {
  const text = t.replace(/\s+/g, ' ').trim()
  const year = text.match(/\b(19\d{2}|20\d{2})\b/)?.[1]
  const km = text.match(/(\d{1,3}(?:[ ,]\d{3})*)\s*km/i)?.[1]
  const yenMatches = [...text.matchAll(/(\d{1,3}(?:[ ,]\d{3})*)\s*¥/g)].map((m) => Number(m[1].replace(/[ ,]/g, '')))
  const firstYen = yenMatches[0] ?? null
  const lastYen = yenMatches[yenMatches.length - 1] ?? null
  const soldYen = /sold|落札/i.test(text) ? lastYen : null
  const startYen = yenMatches.length > 1 ? firstYen : null
  const engineCc = text.match(/\b(\d{3,4})\s*cc\b/i)?.[1]
  const transmission = /\b(mt|manual|\dmt|f5|f6)\b/i.test(text)
    ? 'manual'
    : /\b(at|automatic|cvt|dct)\b/i.test(text)
      ? 'automatic'
      : 'unknown'
  const steering = /\b(lhd|left\s*hand|left[-\s]?steer)\b/i.test(text)
    ? 'left'
    : /\b(rhd|right\s*hand|right[-\s]?steer)\b/i.test(text)
      ? 'right'
      : 'unknown'

  const yearN = year ? Number(year) : null
  const kmN = km ? Number(km.replace(/[ ,]/g, '')) : null
  const priceN = soldYen ?? lastYen
  const compactTitle = [yearN, transmission !== 'unknown' ? transmission.toUpperCase() : null, engineCc ? `${engineCc}cc` : null]
    .filter(Boolean)
    .join(' • ')

  return {
    title: compactTitle || text.slice(0, 120),
    year: yearN,
    mileage_km: kmN,
    price_jpy: priceN,
    payload: {
      row_text: text,
      thumbnail_url: imageUrl,
      engine_cc: engineCc ? Number(engineCc) : null,
      transmission,
      steering,
      start_price_jpy: startYen,
      sold_price_jpy: soldYen
    }
  }
}

function passesWatchFilters(parsed, w) {
  const p = parsed.payload || {}
  const year = parsed.year
  const km = parsed.mileage_km
  const price = parsed.price_jpy
  const engine = p.engine_cc ?? null
  const trans = p.transmission ?? 'unknown'

  const yearOk = (!w.min_year || !year || year >= w.min_year) && (!w.max_year || !year || year <= w.max_year)
  const kmOk = !w.max_km || !km || km <= w.max_km
  const priceOk = !w.max_price_jpy || !price || price <= w.max_price_jpy
  const transOk = !w.transmission || w.transmission === 'any' || trans === w.transmission
  const engineMinOk = !w.min_engine_cc || !engine || engine >= w.min_engine_cc
  const engineMaxOk = !w.max_engine_cc || !engine || engine <= w.max_engine_cc
  return yearOk && kmOk && priceOk && transOk && engineMinOk && engineMaxOk
}

async function scrapeRowsFromCurrentPage(page) {
  const rows = await page.$$eval('tr', (trs) =>
    trs.map((tr) => ({
      text: (tr.textContent || '').replace(/\s+/g, ' ').trim(),
      hrefs: Array.from(tr.querySelectorAll('a[href]')).map((a) => a.getAttribute('href') || ''),
      imgs: Array.from(tr.querySelectorAll('img[src]')).map((i) => i.getAttribute('src') || '')
    }))
  )

  const seen = new Set()
  const out = []
  for (const r of rows) {
    const href = r.hrefs.find((h) => /\.htm/i.test(h) && /-/.test(h))
    if (!href || r.text.length < 20) continue

    const img = r.imgs.find((s) => /imgs\//i.test(s) || /ajes\.com/i.test(s)) || null

    const key = `${href}|${r.text.slice(0, 50)}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ href, text: r.text, image: img })
  }
  return out
}

async function runSearchForWatch(page, watch) {
  const data = await page.evaluate(() => {
    const manufRaw = (document.getElementById('manuf_str')?.textContent || '').trim()
    const list = manufRaw
      .split(';')
      .map((x) => x.split(':'))
      .filter((x) => x.length >= 2)
      .map(([id, name]) => ({ id, name: (name || '').toLowerCase() }))
    return list
  })

  const makeLower = String(watch.make || '').toLowerCase()
  const modelRaw = String(watch.model || '').trim()
  const vendor = data.find((x) => x.name === makeLower || x.name.includes(makeLower))
  if (!vendor) return []

  const baseVariants = [
    modelRaw,
    modelRaw.replace(/-/g, ' '),
    modelRaw.replace(/\s+/g, ' '),
    modelRaw.toUpperCase(),
    modelRaw.toLowerCase(),
    modelRaw.replace(/series/i, 'SERIES').replace(/-/g, ' ').trim()
  ]

  const seriesMatch = modelRaw.match(/\b([1-9])\s*[- ]?series\b/i)
  if (seriesMatch) {
    baseVariants.push(`${seriesMatch[1]} SERIES`)
    baseVariants.push(seriesMatch[1])
  }

  const modelVariants = Array.from(new Set(baseVariants.filter(Boolean)))

  const all = []
  for (const model of modelVariants) {
    await page.evaluate(
      ({ vendorId, model }) => {
        // @ts-ignore
        if (typeof window.model_submit === 'function') {
          // @ts-ignore
          window.model_submit(vendorId, model, 1, 0, 1)
        }
      },
      { vendorId: vendor.id, model }
    )

    await page.waitForTimeout(1800)
    const rows = await scrapeRowsFromCurrentPage(page)
    if (rows.length > 0) all.push(...rows)
  }

  const dedup = new Map()
  for (const r of all) {
    dedup.set(`${r.href}|${r.text.slice(0, 60)}`, r)
  }
  return [...dedup.values()]
}

async function main() {
  const { data: watchlist, error } = await db.from('watchlist').select('*').eq('active', true)
  if (error) throw error
  const wl = watchlist ?? []
  if (wl.length === 0) {
    console.log('No active watchlist items')
    return
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.goto('https://auc.japancardirect.com/', { waitUntil: 'domcontentloaded' })

  // Open login modal if needed, then submit visible login form.
  const modalUser = page.locator('#form_auth input[name="username"]')
  if (!(await modalUser.isVisible().catch(() => false))) {
    await page.evaluate(() => {
      // @ts-ignore
      if (typeof window.aj_login === 'function') {
        // @ts-ignore
        window.aj_login()
      }
    })
    await page.waitForTimeout(500)
  }

  await page.fill('#form_auth input[name="username"]', JCD_USERNAME)
  await page.fill('#form_auth input[name="password"]', JCD_PASSWORD)
  await Promise.all([
    page.waitForLoadState('networkidle'),
    page.keyboard.press('Enter')
  ])
  await page.waitForTimeout(1200)

  let fetched = 0
  let matched = 0
  let inserted = 0
  let updated = 0

  for (const w of wl) {
    let candidates = []
    try {
      // If manual URL exists, use it as override; otherwise run own search by make/model.
      if (w.search_url) {
        await page.goto(w.search_url, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2500)
        candidates = await scrapeRowsFromCurrentPage(page)
      } else {
        candidates = await runSearchForWatch(page, w)
      }
    } catch {
      candidates = []
    }

    for (const c of candidates) {
      fetched += 1
      const url = c.href.startsWith('http') ? c.href : `https://auc.japancardirect.com/${c.href.replace(/^\//, '')}`
      const parsed = parseRowText(c.text, c.image ?? null)
      if (!passesWatchFilters(parsed, w)) continue

      matched += 1
      const sourceId = c.href
      const { data: existing } = await db
        .from('car_listings')
        .select('id')
        .eq('source', 'auc.japancardirect.com')
        .or(`source_listing_id.eq.${sourceId},url.eq.${url}`)
        .maybeSingle()

      if (existing?.id) {
        const { error: upErr } = await db
          .from('car_listings')
          .update({
            ...parsed,
            source: 'auc.japancardirect.com',
            source_listing_id: sourceId,
            make: w.make,
            model: w.model,
            watchlist_id: w.id,
            is_new: false,
            last_seen_at: new Date().toISOString()
          })
          .eq('id', existing.id)
        if (!upErr) updated += 1
      } else {
        const { error: inErr } = await db.from('car_listings').insert({
          ...parsed,
          source: 'auc.japancardirect.com',
          source_listing_id: sourceId,
          url,
          make: w.make,
          model: w.model,
          watchlist_id: w.id,
          is_new: true,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString()
        })
        if (!inErr) inserted += 1
      }
    }

    await page.waitForTimeout(700)
  }

  // Auto-archive: verplaats listings die >14 dagen niet meer gezien zijn.
  const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const { data: expired } = await db
    .from('car_listings')
    .select('*')
    .lt('last_seen_at', cutoff)
    .limit(500)

  if (expired && expired.length > 0) {
    const archiveRows = expired.map((r) => ({ ...r, archived_at: new Date().toISOString() }))
    await db.from('car_listings_archive').insert(archiveRows)
    await db.from('car_listings').delete().in('id', expired.map((r) => r.id))
  }

  // Archive retention: verwijder archive records ouder dan 12 maanden.
  const archiveCutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
  await db.from('car_listings_archive').delete().lt('archived_at', archiveCutoff)

  await db.from('collector_runs').insert({
    status: 'ok',
    fetched_count: fetched,
    matched_count: matched,
    inserted_count: inserted,
    updated_count: updated
  })

  await browser.close()
  console.log(JSON.stringify({ ok: true, fetched, matched, inserted, updated }))
}

main().catch(async (e) => {
  try {
    await db.from('collector_runs').insert({ status: 'fail', error_text: String(e) })
  } catch {}
  console.error(e)
  process.exit(1)
})
