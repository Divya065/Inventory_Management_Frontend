/**
 * Shared calendar-date checks for yyyy-MM-dd inputs.
 * Rejects empty (when required), bad format, impossible days, and absurd years (e.g. 0225).
 */

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** @returns {{ ok: true, ymd: string, year: number, month: number, day: number } | { ok: false }} */
export function parseYmd(value) {
  const raw = String(value ?? '').trim()
  if (!raw) return { ok: false }

  const match = YMD_RE.exec(raw)
  if (!match) return { ok: false }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  // Reject padded nonsense years like 0225 (→ 225) and far-future junk
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { ok: false }
  if (!Number.isInteger(month) || month < 1 || month > 12) return { ok: false }
  if (!Number.isInteger(day) || day < 1 || day > 31) return { ok: false }

  const dt = new Date(year, month - 1, day)
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getFullYear() !== year ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day
  ) {
    return { ok: false }
  }

  return { ok: true, ymd: raw, year, month, day }
}

/**
 * @param {string} value
 * @param {{ required?: boolean, maxYmd?: string | null, minYmd?: string | null }} [options]
 * @returns {string | null} "Invalid date" or null when OK
 */
export function getDateFieldError(value, { required = false, maxYmd = null, minYmd = null } = {}) {
  const raw = String(value ?? '').trim()
  if (!raw) return required ? 'Invalid date' : null

  const parsed = parseYmd(raw)
  if (!parsed.ok) return 'Invalid date'

  if (minYmd && parsed.ymd < minYmd) return 'Invalid date'
  if (maxYmd && parsed.ymd > maxYmd) return 'Invalid date'

  return null
}

export function isValidYmd(value, options = {}) {
  const raw = String(value ?? '').trim()
  if (!raw) return false
  return getDateFieldError(value, options) === null
}
