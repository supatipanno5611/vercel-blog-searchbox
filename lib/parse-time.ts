export const TIME_PATTERN = '\\d+(?::\\d{1,2}){0,2}(?:\\.\\d+)?'

export function parseTime(s: string): number {
  const parts = s.split(':').map(Number)
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return 0
}
