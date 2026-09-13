import type { LetterState } from './types';

export const APP_SHARE_NAME = 'WordDrop';

const STANDARD: Record<LetterState, string> = {
  correct: '🟩',
  present: '🟨',
  absent: '⬜',
};

/**
 * Blue/orange rather than green/yellow, for players who cannot separate the
 * standard pair. The share text follows the same setting as the board, so a
 * pasted grid reads the way the player saw it.
 */
const HIGH_CONTRAST: Record<LetterState, string> = {
  correct: '🟧',
  present: '🟦',
  absent: '⬜',
};

export const gridRow = (states: LetterState[], highContrast: boolean): string =>
  states.map((s) => (highContrast ? HIGH_CONTRAST : STANDARD)[s]).join('');

export interface ShareOptions {
  puzzleNumber: number;
  rows: LetterState[][];
  won: boolean;
  maxAttempts: number;
  highContrast: boolean;
  /** Accepted so callers cannot accidentally pass it into the text. */
  answer?: string;
}

/**
 * The spoiler-free result grid.
 *
 * The answer is never rendered — that is the whole point of the format, and it
 * is what makes the text safe to paste into a group chat where others have not
 * played yet.
 */
export function buildShareText(options: ShareOptions): string {
  const { puzzleNumber, rows, won, maxAttempts, highContrast } = options;
  const score = won ? `${rows.length}/${maxAttempts}` : `X/${maxAttempts}`;
  const header = `${APP_SHARE_NAME} #${puzzleNumber} ${score}`;
  return [header, '', ...rows.map((r) => gridRow(r, highContrast))].join('\n');
}
