export function formatViews(num: number | null | undefined): string {
  if (num == null || Number.isNaN(num)) return '0';
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return String(num);
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatUploadDate(uploadDate: string | null | undefined): string {
  if (!uploadDate || uploadDate.length < 8) return '';
  const y = uploadDate.slice(0, 4);
  const m = uploadDate.slice(4, 6);
  const d = uploadDate.slice(6, 8);
  const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return uploadDate;
  const diffMs = Date.now() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return 'hoje';
  if (days === 1) return 'há 1 dia';
  if (days < 7) return `há ${days} dias`;
  if (days < 30) return `há ${Math.floor(days / 7)} sem`;
  if (days < 365) return `há ${Math.floor(days / 30)} meses`;
  return `há ${Math.floor(days / 365)} anos`;
}

export function parseCategories(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(String);
    }
  } catch {
    // ignore
  }
  return [raw];
}

/** Normalize genre tokens for matching (accents stripped, lowercased). */
export function normalizeGenre(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Parse comma-separated `genres` column into normalized tokens. */
export function parseGenres(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const g = normalizeGenre(part);
    if (!g || seen.has(g)) continue;
    seen.add(g);
    out.push(g);
  }
  return out;
}

/** How many genres two lists share (after normalization). */
export function sharedGenreCount(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  let n = 0;
  for (const g of a) {
    if (setB.has(g)) n += 1;
  }
  return n;
}
