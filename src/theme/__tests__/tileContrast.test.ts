/**
 * The empty tile has to be visible, because it IS the board.
 *
 * `tileEmpty` is `'transparent'` by design -- an unplayed square is meant to be
 * an outline, not a filled box. That makes `tileEmptyBorder` the whole tile, and
 * before the first letter is typed a board is nothing but thirty of those
 * outlines.
 *
 * It was #2A3444 at 1.53:1 against the dark background and #D8D8D2 at 1.33:1
 * against the light one. The screenshot live on the App Store for the 13-inch
 * iPad has a third of the frame indistinguishable from its own background, and
 * this is why: the grid is drawn, and it cannot be seen.
 *
 * WCAG AA asks 3:1 for the boundary of a non-text UI component. The palette's
 * own header already promises careful contrast work for the feedback colours
 * and for high-contrast mode -- it simply never said anything about the tile
 * that is on screen before any of those apply.
 */
const BACKGROUND = { dark: '#0B0F16', light: '#F7F7F5' } as const;
const TILE_EMPTY_BORDER = { dark: '#59677E', light: '#8C8C84' } as const;
const MIN_COMPONENT_CONTRAST = 3;

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)) as [
    number,
    number,
    number,
  ];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe('the empty board is visible', () => {
  it('outlines an empty tile at 3:1 against the dark background', () => {
    expect(contrastRatio(TILE_EMPTY_BORDER.dark, BACKGROUND.dark)).toBeGreaterThanOrEqual(
      MIN_COMPONENT_CONTRAST,
    );
  });

  it('outlines an empty tile at 3:1 against the light background', () => {
    expect(contrastRatio(TILE_EMPTY_BORDER.light, BACKGROUND.light)).toBeGreaterThanOrEqual(
      MIN_COMPONENT_CONTRAST,
    );
  });

  it('uses the values the theme actually ships', () => {
    // The constants above are duplicated from useTheme, which is a hook and
    // cannot be read without rendering. Duplication that drifts is worse than
    // no test, so this reads the source and fails if the two disagree.
    const source = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'useTheme.ts'),
      'utf8',
    );
    expect(source).toContain(
      `tileEmptyBorder: isDark ? '${TILE_EMPTY_BORDER.dark}' : '${TILE_EMPTY_BORDER.light}'`,
    );
    expect(source).toContain(`background: isDark ? '${BACKGROUND.dark}' : '${BACKGROUND.light}'`);
  });
});
