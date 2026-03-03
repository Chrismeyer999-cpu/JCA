import { NextRequest, NextResponse } from 'next/server'
import { runCollector } from '@/lib/collector'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

export const runtime = 'nodejs'

const execFileAsync = promisify(execFile)

async function runPlaywrightCollectorScript() {
  const scriptPath = join(process.cwd(), 'scripts', 'collector-playwright.mjs')
  if (!existsSync(scriptPath)) {
    throw new Error('Playwright script not available in this runtime')
  }

  const { stdout } = await execFileAsync(process.execPath, [scriptPath], {
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
  const isManual = req.nextUrl.searchParams.get('manual') === '1'
  const secret = process.env.CRON_SECRET
  if (secret && !isManual) {
    const incoming = req.headers.get('authorization')?.replace('Bearer ', '')
    if (incoming !== secret) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const canUsePlaywright = !!process.env.JCD_USERNAME && !!process.env.JCD_PASSWORD

    if (canUsePlaywright) {
      try {
        const result = await runPlaywrightCollectorScript()
        return NextResponse.json({ ok: true, mode: 'playwright', ...result })
      } catch (playErr) {
        const fallback = await runCollector()
        return NextResponse.json({
          ok: true,
          mode: 'http-fallback',
          warning: playErr instanceof Error ? playErr.message : 'Playwright unavailable',
          ...fallback
        })
      }
    }

    const result = await runCollector()
    return NextResponse.json({ ok: true, mode: 'http', ...result })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Collector failed' },
      { status: 500 }
    )
  }
}
