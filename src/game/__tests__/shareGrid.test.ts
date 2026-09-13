import { buildShareText, gridRow } from '../shareGrid';

const rows = [
  ['absent', 'present', 'absent', 'absent', 'correct'],
  ['correct', 'correct', 'correct', 'correct', 'correct'],
] as const;

describe('gridRow', () => {
  it('renders the standard palette', () => {
    expect(gridRow([...rows[0]], false)).toBe('⬜🟨⬜⬜🟩');
  });

  it('renders the high-contrast palette when asked', () => {
    expect(gridRow([...rows[0]], true)).toBe('⬜🟦⬜⬜🟧');
  });
});

describe('buildShareText', () => {
  it('reports the score and the grid, and never the answer', () => {
    const text = buildShareText({
      puzzleNumber: 12,
      rows: rows.map((r) => [...r]),
      won: true,
      maxAttempts: 6,
      highContrast: false,
      answer: 'SCENE',
    });
    expect(text).toContain('WordDrop #12 2/6');
    expect(text).toContain('⬜🟨⬜⬜🟩');
    expect(text).toContain('🟩🟩🟩🟩🟩');
    expect(text).not.toContain('SCENE');
  });

  it('marks a loss with X rather than an attempt count', () => {
    const text = buildShareText({
      puzzleNumber: 12,
      rows: [[...rows[0]]],
      won: false,
      maxAttempts: 6,
      highContrast: false,
      answer: 'SCENE',
    });
    expect(text).toContain('WordDrop #12 X/6');
  });

  it('produces one grid line per guess played', () => {
    const text = buildShareText({
      puzzleNumber: 3,
      rows: rows.map((r) => [...r]),
      won: true,
      maxAttempts: 6,
      highContrast: false,
      answer: 'SCENE',
    });
    expect(text.trim().split('\n').filter((l) => l.includes('⬜') || l.includes('🟩'))).toHaveLength(2);
  });
});
