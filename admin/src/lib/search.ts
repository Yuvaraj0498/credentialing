/**
 * The search rule of every list (same as the server's SearchText): case does not matter, extra spaces are
 * ignored, and every word typed must appear somewhere in the row ("john cahill" finds John Cahill).
 * A single character matches the START of a word ("a" finds Alicia and Aetna, not every name with an a in it);
 * two or more characters match anywhere.
 */
export function searchWords(q: string): string[] {
  return q.toLowerCase().trim().split(/[\s,]+/).filter(Boolean);
}

function containsWord(hay: string, word: string): boolean {
  if (word.length > 1) return hay.includes(word);
  for (let i = hay.indexOf(word); i >= 0; i = hay.indexOf(word, i + 1)) {
    if (i === 0 || !/[\p{L}\p{N}]/u.test(hay[i - 1])) return true;
  }
  return false;
}

export function matchesSearch(q: string, ...fields: (string | number | null | undefined)[]): boolean {
  const words = searchWords(q);
  if (!words.length) return true;
  const hay = fields.filter((f) => f !== null && f !== undefined && f !== "").join(" ").toLowerCase();
  return words.every((w) => containsWord(hay, w));
}
