import { NextRequest, NextResponse } from 'next/server'
import { runCollector } from '@/lib/collector'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

export const runtime = 'nodejs'

const execFileAsync = promisify(execFile)

async function runPlaywrightCollectorScript() {
  const { stdout } = await execFileAsync(process.execPath, ['scripts/collector-playwright.mjs'], {
    cwd: process.cwd(),
    env: process.env,
    timeout: 1000 * 60 * 4,
    maxBuffer: 1024 * 1024 * 4
  })

  const lines = stdout.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
  const jsonLine = [...lines].reverse().find((x) => x.startsWith('{') && x.endsWith('}'))
  if (!jsonLine) return { ok: true, raw: stdout }
  return JSON.parse(jsonLine)
}

export async function GET(req: NextRequest) {
  const isManualDev = req.nextUrl.searchParams.get('manual') === '1' && process.env.NODE_ENV !== 'production'
  const secret = process.env.CRON_SECRET
  if (secret && !isManualDev) {
    const incoming = req.headers.get('authorization')?.replace('Bearer ', '')
    if (incoming !== secret) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const canUsePlaywright = !!process.env.JCD_USERNAME && !!process.env.JCD_PASSWORD
    const result = canUsePlaywright
      ? await runPlaywrightCollectorScript()
      : await runCollector()

    return NextResponse.json({ ok: true, mode: canUsePlaywright ? 'playwright' : 'http', ...result })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Collector failed' },
      { status: 500 }
    )
  }
}
