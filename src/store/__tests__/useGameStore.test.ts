jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { useGameStore, boardAnswer, boardGuesses, safeBoardAnswer } from '../useGameStore';
import { EMPTY_STATS } from '../../game/streak';
import { MAX_ATTEMPTS, type DailyPuzzle } from '../../game/types';

const puzzle = (overrides: Partial<DailyPuzzle> = {}): DailyPuzzle => ({
  word: 'SCENE',
  category: 'Craft',
  clue: 'One continuous piece of the story',
  date: '2026-04-07',
  dayIndex: 96,
  number: 97,
  ...overrides,
});

const reset = () =>
  useGameStore.setState({
    isPro: false,
    stats: EMPTY_STATS,
    boards: {},
    adShownOn: [],
  });

beforeEach(reset);

describe('ensureBoard', () => {
  it('creates a board with the answer stored encoded, not in plain text', () => {
    const board = useGameStore.getState().ensureBoard(puzzle());
    expect(board.a).not.toContain('SCENE');
    expect(boardAnswer(board)).toBe('SCENE');
    expect(board.length).toBe(5);
    expect(board.status).toBe('in_progress');
  });

  it('does not replace a board that is already in play', () => {
    const store = useGameStore.getState();
    store.ensureBoard(puzzle());
    store.commitGuess('2026-04-07', 'CRANE');
    // A different answer for the same date must not wipe the guess on screen.
    const again = useGameStore.getState().ensureBoard(puzzle({ word: 'ALIEN' }));
    expect(again.guesses).toEqual(['CRANE']);
    expect(boardAnswer(again)).toBe('SCENE');
  });

  it('rebuilds a board whose stored answer cannot be read back', () => {
    const store = useGameStore.getState();
    const board = store.ensureBoard(puzzle());
    useGameStore.setState({
      boards: { '2026-04-07': { ...board, a: 'corrupted !!' } },
    });
    const rebuilt = useGameStore.getState().ensureBoard(puzzle());
    expect(safeBoardAnswer(rebuilt)).toBe('SCENE');
    expect(rebuilt.guesses).toEqual([]);
  });
});

describe('commitGuess', () => {
  it('records a guess and leaves the game running', () => {
    const store = useGameStore.getState();
    store.ensureBoard(puzzle());
    expect(store.commitGuess('2026-04-07', 'CRANE')).toEqual({
      status: 'accepted',
      gameStatus: 'in_progress',
    });
    expect(useGameStore.getState().stats.played).toBe(0);
  });

  it('refuses a repeat of a word already guessed', () => {
    const store = useGameStore.getState();
    store.ensureBoard(puzzle());
    store.commitGuess('2026-04-07', 'CRANE');
    expect(useGameStore.getState().commitGuess('2026-04-07', 'CRANE')).toEqual({
      status: 'duplicate_guess',
    });
  });

  it('refuses a guess of the wrong length', () => {
    const store = useGameStore.getState();
    store.ensureBoard(puzzle());
    expect(store.commitGuess('2026-04-07', 'CAST')).toEqual({ status: 'too_short' });
  });

  it('wins on the right word and records the result once', () => {
    const store = useGameStore.getState();
    store.ensureBoard(puzzle());
    expect(store.commitGuess('2026-04-07', 'SCENE')).toEqual({
      status: 'accepted',
      gameStatus: 'won',
    });
    const stats = useGameStore.getState().stats;
    expect(stats.played).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.currentStreak).toBe(1);
    expect(stats.distribution[0]).toBe(1);
  });

  it('loses after the last attempt and resets the streak', () => {
    const store = useGameStore.getState();
    store.ensureBoard(puzzle());
    const wrong = ['CRANE', 'MOIST', 'PLUCK', 'BADGE', 'WHIFF', 'VEXED'];
    let last;
    for (const word of wrong) last = useGameStore.getState().commitGuess('2026-04-07', word);
    expect(last).toEqual({ status: 'accepted', gameStatus: 'lost' });
    const state = useGameStore.getState();
    expect(state.boards['2026-04-07'].guesses).toHaveLength(MAX_ATTEMPTS);
    expect(state.stats.played).toBe(1);
    expect(state.stats.wins).toBe(0);
    expect(state.stats.currentStreak).toBe(0);
  });

  it('refuses any further guess once the board is finished', () => {
    const store = useGameStore.getState();
    store.ensureBoard(puzzle());
    store.commitGuess('2026-04-07', 'SCENE');
    expect(useGameStore.getState().commitGuess('2026-04-07', 'CRANE')).toEqual({
      status: 'already_finished',
    });
  });

  it('reports an unreadable board rather than inventing a result', () => {
    const store = useGameStore.getState();
    const board = store.ensureBoard(puzzle());
    useGameStore.setState({ boards: { '2026-04-07': { ...board, a: 'corrupted !!' } } });
    expect(useGameStore.getState().commitGuess('2026-04-07', 'CRANE')).toEqual({
      status: 'board_unreadable',
    });
  });

  // Replaying an old archive puzzle must not rewrite a live streak.
  it('leaves the record untouched for a day older than the last one played', () => {
    const store = useGameStore.getState();
    store.ensureBoard(puzzle());
    store.commitGuess('2026-04-07', 'SCENE');
    const after = useGameStore.getState().stats;

    useGameStore.getState().ensureBoard(puzzle({ date: '2026-03-01', dayIndex: 59, number: 60 }));
    useGameStore.getState().commitGuess('2026-03-01', 'SCENE');
    expect(useGameStore.getState().stats).toEqual(after);
    expect(useGameStore.getState().boards['2026-03-01'].status).toBe('won');
  });
});

describe('boardGuesses', () => {
  it('evaluates every stored guess against the answer', () => {
    const store = useGameStore.getState();
    store.ensureBoard(puzzle());
    store.commitGuess('2026-04-07', 'CRANE');
    const played = boardGuesses(useGameStore.getState().boards['2026-04-07']);
    expect(played).toHaveLength(1);
    expect(played[0].states).toHaveLength(5);
    expect(played[0].states[4]).toBe('correct');
  });

  it('returns nothing for an unreadable board instead of throwing', () => {
    const store = useGameStore.getState();
    const board = store.ensureBoard(puzzle());
    expect(boardGuesses({ ...board, a: 'corrupted !!' })).toEqual([]);
  });
});

describe('the daily ad ledger', () => {
  it('remembers the days an interstitial was shown', () => {
    const store = useGameStore.getState();
    expect(store.hasSeenAdOn('2026-04-07')).toBe(false);
    store.markAdShown('2026-04-07');
    expect(useGameStore.getState().hasSeenAdOn('2026-04-07')).toBe(true);
    expect(useGameStore.getState().hasSeenAdOn('2026-04-08')).toBe(false);
  });

  it('does not grow without bound', () => {
    const store = useGameStore.getState();
    for (let i = 1; i <= 30; i += 1) {
      useGameStore.getState().markAdShown(`2026-04-${String(i).padStart(2, '0')}`);
    }
    expect(useGameStore.getState().adShownOn.length).toBeLessThanOrEqual(14);
    void store;
  });
});
