/**
 * Draft notes seeded with the first content (internal remarks such as "an approved description has
 * not been supplied"). They are not meant for visitors, so they are shown as empty until real text
 * is written in the dashboard; any other text is shown as it is.
 */
const DRAFT_NOTES = new Set(
  [
    'Meet one confirmed brand from Octogenix Pharma’s portfolio.',
    'تعرّفوا على إحدى العلامات المؤكدة ضمن محفظة أوكتوجينيكس فارما.',
    'A confirmed represented brand',
    'علامة تجارية مؤكدة ضمن محفظتنا',
    'Jovie has been identified as a brand represented by the company. An approved brand description has not been supplied.',
    'تم تحديد Jovie ضمن العلامات التي تمثلها الشركة. لم يُقدَّم وصف معتمد للعلامة.',
  ].map(normalise),
);

/** Compared without Arabic diacritics (stored in varying order) and extra spaces. */
function normalise(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[ً-ْٰ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The text, or an empty string when it is one of the seeded draft notes. */
export function publicCopy(text: string | null | undefined): string {
  const value = text ?? '';
  return DRAFT_NOTES.has(normalise(value)) ? '' : value;
}
