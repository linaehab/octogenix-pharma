/**
 * EGP amounts typed by an admin <-> integer piastres stored by the API. Parsed as text, digit by
 * digit, so no floating-point value is ever involved (e.g. "520.10" -> 52010, never 52009.999…).
 */

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;

/** Arabic-Indic and Persian digits typed on an Arabic keyboard, as ASCII digits. */
function asciiDigits(text: string): string {
  return text.replace(ARABIC_DIGITS, (d) => String((d.charCodeAt(0) - (d >= '۰' ? 0x06f0 : 0x0660)) % 10));
}

/**
 * "520", "520.5", "520.50", "1,250.75" or "٥٢٠٫٥" -> piastres. Empty -> null. Anything else (negative,
 * more than two decimals, letters) -> NaN, which the form reports as invalid.
 */
export function egpToPiastres(input: string | null | undefined): number | null {
  const text = asciiDigits(String(input ?? '').trim())
    .replace(/٫/g, '.')
    .replace(/[,\s٬]/g, '');
  if (text === '') {
    return null;
  }
  const match = /^(\d{1,8})(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) {
    return Number.NaN;
  }
  const pounds = Number.parseInt(match[1], 10);
  const piastres = Number.parseInt((match[2] ?? '').padEnd(2, '0'), 10);
  return pounds * 100 + piastres;
}

/** 52010 -> "520.10", 50000 -> "500" (for the input field; null -> ""). */
export function piastresToEgp(piastres: number | null | undefined): string {
  if (piastres === null || piastres === undefined) {
    return '';
  }
  const pounds = Math.trunc(piastres / 100);
  const rest = piastres % 100;
  return rest === 0 ? String(pounds) : `${pounds}.${String(rest).padStart(2, '0')}`;
}
