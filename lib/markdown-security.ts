export const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/

export function isSafeInternalPath(value: string) {
  return value.startsWith('/') && !value.startsWith('//') && !/[^\S\r\n]/.test(value)
}

export function isSafeAudioSrc(value: string) {
  if (isSafeInternalPath(value)) return true

  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export function isSafeHref(value: string) {
  if (isSafeInternalPath(value)) return true
  if (value.startsWith('#')) return true

  try {
    const protocol = new URL(value).protocol
    return protocol === 'https:' || protocol === 'http:' || protocol === 'mailto:'
  } catch {
    return false
  }
}
