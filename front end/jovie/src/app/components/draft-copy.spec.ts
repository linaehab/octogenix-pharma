import { publicCopy } from './draft-copy';

describe('publicCopy', () => {
  it('hides the seeded draft notes in both languages', () => {
    expect(publicCopy('A confirmed represented brand')).toBe('');
    // Same Arabic note with its diacritics stored in a different order
    expect(publicCopy('تم تحديد Jovie ضمن العلامات التي تمثلها الشركة. لم يُقَدَّم وصف معتمد للعلامة.')).toBe('');
    expect(publicCopy('  Meet one confirmed brand from Octogenix Pharma’s portfolio. ')).toBe('');
  });

  it('keeps any other text as it is', () => {
    expect(publicCopy('Infant formula made in the Netherlands.')).toBe('Infant formula made in the Netherlands.');
    expect(publicCopy(null)).toBe('');
  });
});
