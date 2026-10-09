/**
 * The search rule of every list (same as the server's SearchText): case does not matter, extra spaces are
 * ignored, and every word typed must appear somewhere in the row ("john cahill" finds John Cahill).
 */
export function searchWords(q: string): string[] {
  return q.toLowerCase().trim().split(/[\s,]+/).filter(Boolean);
}

export function matchesSearch(q: string, ...fields: (string | number | null | undefined)[]): boolean {
  const words = searchWords(q);
  if (!words.length) return true;
  const hay = fields.filter((f) => f !== null && f !== undefined && f !== "").join(" ").toLowerCase();
  return words.every((w) => hay.includes(w));
}
