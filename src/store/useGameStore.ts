import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encodeAnswer, decodeAnswer } from '../game/puzzleCodec';
import { evaluateGuess, isWinningGuess } from '../game/evaluateGuess';
import { applyResult, EMPTY_STATS, type Stats } from '../game/streak';
import { MAX_ATTEMPTS, type DailyPuzzle, type GameStatus, type PlayedGuess } from '../game/types';

/**
 * One day's board.
 *
 * The answer is held encoded rather than in plain text, because this object is
 * written to AsyncStorage: a player poking at a backup should not be handed the
 * day's word, and neither should a crash log that dumps persisted state.
 */
export interface Board {
  date: string;
  /** Encoded answer — read it through {@link boardAnswer}. */
  a: string;
  length: number;
  category: string;
  clue: string;
  number: number;
  guesses: string[];
  status: GameStatus;
  /** Local timestamp the board was completed, for the result screen. */
  completedAt?: number;
}

export const boardAnswer = (board: Board): string => decodeAnswer(board.a);

/**
 * The answer, or null when the persisted board cannot be read back — a
 * truncated write or a hand-edited backup would otherwise throw straight
 * through a screen's render and take the app down on launch.
 */
export const safeBoardAnswer = (board: Board): string | null => {
  try {
    return boardAnswer(board);
  } catch {
    return null;
  }
};

export const boardGuesses = (board: Board): PlayedGuess[] => {
  const answer = safeBoardAnswer(board);
  if (!answer) return [];
  return board.guesses.map((guess) => ({ guess, states: evaluateGuess(guess, answer) }));
};

export interface Settings {
  highContrast: boolean;
  haptics: boolean;
  reminderEnabled: boolean;
  /** 24-hour local time, `HH:MM`. */
  reminderTime: string;
}

export type SubmitOutcome =
  | { status: 'accepted'; gameStatus: GameStatus }
  | { status: 'too_short' }
  | { status: 'unknown_word' }
  | { status: 'already_finished' }
  | { status: 'duplicate_guess' }
  /** The persisted board could not be read back; it is rebuilt on next mount. */
  | { status: 'board_unreadable' };

/** Boards older than this are dropped; the archive re-creates them on demand. */
const MAX_BOARDS = 90;

interface GameState {
  isPro: boolean;
  stats: Stats;
  settings: Settings;
  boards: Record<string, Board>;
  /** Local dates on which the daily interstitial has already been shown. */
  adShownOn: string[];
  hydrated: boolean;

  setIsPro: (value: boolean) => void;
  setSettings: (patch: Partial<Settings>) => void;
  ensureBoard: (puzzle: DailyPuzzle) => Board;
  commitGuess: (date: string, guess: string) => SubmitOutcome;
  markAdShown: (date: string) => void;
  hasSeenAdOn: (date: string) => boolean;
  resetEverything: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  highContrast: false,
  haptics: true,
  reminderEnabled: false,
  reminderTime: '20:00',
};

const prune = (boards: Record<string, Board>): Record<string, Board> => {
  const dates = Object.keys(boards).sort();
  if (dates.length <= MAX_BOARDS) return boards;
  const keep = dates.slice(dates.length - MAX_BOARDS);
  return Object.fromEntries(keep.map((d) => [d, boards[d]]));
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      isPro: false,
      stats: EMPTY_STATS,
      settings: DEFAULT_SETTINGS,
      boards: {},
      adShownOn: [],
      hydrated: false,

      setIsPro: (value) => set({ isPro: value }),

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      ensureBoard: (puzzle) => {
        const existing = get().boards[puzzle.date];
        // A board already in progress is never replaced: the Worker and the
        // bundled list agree on the answer, but if they ever did not, silently
        // swapping the word mid-game would invalidate the guesses on screen.
        // An unreadable board is the one exception — it is rebuilt rather than
        // left to throw on every render of that day.
        if (existing && safeBoardAnswer(existing) !== null) return existing;

        const board: Board = {
          date: puzzle.date,
          a: encodeAnswer(puzzle.word),
          length: puzzle.word.length,
          category: puzzle.category,
          clue: puzzle.clue,
          number: puzzle.number,
          guesses: [],
          status: 'in_progress',
        };
        set((s) => ({ boards: prune({ ...s.boards, [puzzle.date]: board }) }));
        return board;
      },

      commitGuess: (date, guess) => {
        const board = get().boards[date];
        if (!board) return { status: 'too_short' };
        if (board.status !== 'in_progress') return { status: 'already_finished' };

        const word = guess.trim().toUpperCase();
        if (word.length !== board.length) return { status: 'too_short' };
        if (board.guesses.includes(word)) return { status: 'duplicate_guess' };

        const answer = safeBoardAnswer(board);
        if (!answer) return { status: 'board_unreadable' };
        const won = isWinningGuess(evaluateGuess(word, answer));
        const guesses = [...board.guesses, word];
        const status: GameStatus = won
          ? 'won'
          : guesses.length >= MAX_ATTEMPTS
            ? 'lost'
            : 'in_progress';

        const updated: Board = {
          ...board,
          guesses,
          status,
          completedAt: status === 'in_progress' ? undefined : Date.now(),
        };

        set((s) => {
          // An archive result older than the last completed day leaves the
          // record untouched — `applyResult` ignores it — so replaying history
          // can neither inflate nor break a live streak.
          const stats =
            status === 'in_progress'
              ? s.stats
              : applyResult(s.stats, {
                  date,
                  won: status === 'won',
                  attempts: guesses.length,
                });
          return { boards: { ...s.boards, [date]: updated }, stats };
        });

        return { status: 'accepted', gameStatus: status };
      },

      markAdShown: (date) =>
        set((s) => ({ adShownOn: [...new Set([...s.adShownOn, date])].slice(-14) })),

      hasSeenAdOn: (date) => get().adShownOn.includes(date),

      resetEverything: () =>
        set({ stats: EMPTY_STATS, boards: {}, adShownOn: [], settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'worddrop-state-v1',
      storage: createJSONStorage(() => AsyncStorage),
      // isPro is deliberately not persisted: entitlement comes from RevenueCat
      // on every launch, so a stale cache can never hand out the unlock.
      partialize: ({ stats, settings, boards, adShownOn }) => ({
        stats,
        settings,
        boards,
        adShownOn,
      }),
    },
  ),
);

// `persist` calls back once the stored state is in memory. The flag lets the UI
// hold its first paint for a frame rather than flashing an empty streak at a
// returning player and then correcting itself.
useGameStore.persist.onFinishHydration(() => useGameStore.setState({ hydrated: true }));
if (useGameStore.persist.hasHydrated()) useGameStore.setState({ hydrated: true });
