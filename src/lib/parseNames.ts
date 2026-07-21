/**
 * Turn a blob of pasted text into a clean list of names.
 *
 * Designed for real-world phone paste: contact lists, notes with bullet points,
 * numbered lists, "First, Second, Third" on one line, etc. It strips common list
 * markers and drops lines that are just phone numbers.
 */

/** Split, clean and filter a pasted blob into individual names. */
export function parseNames(raw: string): string[] {
  if (!raw) return []
  // Split on line breaks, semicolons and tabs. Also split on commas, but ONLY
  // when the paste is a single line ("Alice, Bob, Charlie") — so multi-line
  // pastes can still contain "Last, First" style entries without being broken up.
  const hasNewline = /[\r\n]/.test(raw)
  const separator = hasNewline ? /[\r\n;\t]+/ : /[\r\n;\t,]+/
  const out: string[] = []
  for (const chunk of raw.split(separator)) {
    const name = cleanName(chunk)
    if (name) out.push(name)
  }
  return out
}

/** Strip a leading list marker + surrounding whitespace; drop phone-number lines. */
function cleanName(line: string): string {
  let s = line.trim()
  if (!s) return ''
  // Numbered-list marker: "1." · "2)" · "(3)" · "12 - " → keep the text after it.
  s = s.replace(/^\(?\d+\)?(?:[.)]\s*|\s+)/, '')
  // Bullet / arrow markers of any kind.
  s = s.replace(/^[-*•‣·▪●◦○☆★▶►▸→>»–—]+\s*/, '')
  // Collapse internal whitespace runs.
  s = s.replace(/\s+/g, ' ').trim()
  // A line that is only digits / phone punctuation is a phone number, not a name.
  if (/^[\d\s()+.\-]{4,}$/.test(s)) return ''
  return s
}
