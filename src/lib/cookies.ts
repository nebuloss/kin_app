/**
 * Cookie-backed persistence.
 *
 * Per the project brief, ALL state lives in cookies — no backend database, no
 * localStorage, no IndexedDB. Cookies are capped at ~4 KB each by browsers,
 * which is plenty for a player list. Values are JSON-encoded then URI-encoded,
 * scoped to the whole site (path=/), kept for a year, and marked SameSite=Lax.
 */

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365 // 1 year
const MAX_COOKIE_BYTES = 4000 // conservative; real browser limit is ~4096 incl. the name

export function readCookie(name: string): string | null {
  if (typeof document === 'undefined' || !document.cookie) return null
  const prefix = `${encodeURIComponent(name)}=`
  for (const part of document.cookie.split('; ')) {
    if (part.startsWith(prefix)) {
      try {
        return decodeURIComponent(part.slice(prefix.length))
      } catch {
        return null
      }
    }
  }
  return null
}

function writeRawCookie(name: string, value: string): void {
  document.cookie =
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE_SECONDS}; SameSite=Lax`
}

export function deleteCookie(name: string): void {
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; SameSite=Lax`
}

export function readCookieJSON<T>(name: string, fallback: T): T {
  const raw = readCookie(name)
  if (raw == null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/**
 * Persists a value as a JSON cookie. Returns false instead of throwing on
 * failure (e.g. the serialised value exceeds the ~4 KB cookie limit) so that a
 * write happening inside a React state updater can never tear down the tree.
 */
export function writeCookieJSON<T>(name: string, value: T): boolean {
  try {
    const serialised = JSON.stringify(value)
    const encodedBytes = encodeURIComponent(serialised).length + encodeURIComponent(name).length + 1
    if (encodedBytes > MAX_COOKIE_BYTES) {
      console.warn(`Cookie "${name}" is too large (${encodedBytes} bytes) — not persisted.`)
      return false
    }
    writeRawCookie(name, serialised)
    return true
  } catch (err) {
    console.warn(`Failed to persist cookie "${name}":`, err)
    return false
  }
}
