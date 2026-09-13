import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { useGameStore, safeBoardAnswer, boardGuesses, type Board } from '../store/useGameStore';
import { resolvePuzzle, type PuzzleSource } from '../services/puzzleService';
import { mergeKeyboardStates } from '../game/evaluateGuess';
import { isValidGuess } from '../game/dictionary';
import { MAX_ATTEMPTS, type GameStatus, type LetterState } from '../game/types';
import { t } from '../i18n';

export interface DailyGame {
  board: Board | null;
  loading: boolean;
  source: PuzzleSource | null;
  current: string;
  played: ReturnType<typeof boardGuesses>;
  keyboard: Record<string, LetterState>;
  status: GameStatus;
  answer: string | null;
  /** Bumped whenever a guess is rejected, so the board can shake once. */
  shakeToken: number;
  message: string | null;
  clearMessage: () => void;
  pressLetter: (letter: string) => void;
  pressDelete: () => void;
  submit: () => GameStatus | null;
}

/**
 * One day's game: fetches (or derives) the puzzle, restores any guesses already
 * made, and validates new ones. The board itself lives in the persisted store,
 * so backgrounding the app mid-game loses nothing.
 */
export function useDailyGame(date: string): DailyGame {
  const board = useGameStore((s) => s.boards[date] ?? null);
  const ensureBoard = useGameStore((s) => s.ensureBoard);
  const commitGuess = useGameStore((s) => s.commitGuess);
  const hapticsOn = useGameStore((s) => s.settings.haptics);

  const [loading, setLoading] = useState(!board);
  const [source, setSource] = useState<PuzzleSource | null>(null);
  const [current, setCurrent] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [shakeToken, setShakeToken] = useState(0);
  const requestedFor = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (requestedFor.current === date) return undefined;
    requestedFor.current = date;
    setLoading(!board);

    resolvePuzzle(date).then(({ puzzle, source: from }) => {
      if (cancelled) return;
      ensureBoard(puzzle);
      setSource(from);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // `board` is deliberately not a dependency: re-resolving on every guess
    // would hit the network once per keystroke-committed row.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, ensureBoard]);

  useEffect(() => setCurrent(''), [date]);

  const played = useMemo(() => (board ? boardGuesses(board) : []), [board]);
  const keyboard = useMemo(() => mergeKeyboardStates(played), [played]);
  const status: GameStatus = board?.status ?? 'in_progress';
  const answer = board && status !== 'in_progress' ? safeBoardAnswer(board) : null;

  const reject = useCallback(
    (text: string) => {
      setMessage(text);
      setShakeToken((n) => n + 1);
      if (hapticsOn) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    },
    [hapticsOn],
  );

  const pressLetter = useCallback(
    (letter: string) => {
      if (!board || board.status !== 'in_progress') return;
      setCurrent((value) => (value.length >= board.length ? value : value + letter));
    },
    [board],
  );

  const pressDelete = useCallback(() => setCurrent((value) => value.slice(0, -1)), []);

  const submit = useCallback((): GameStatus | null => {
    if (!board) return null;
    if (board.status !== 'in_progress') {
      reject(t('gameFinished'));
      return null;
    }
    if (current.length < board.length) {
      reject(t('notEnoughLetters'));
      return null;
    }
    if (board.guesses.includes(current)) {
      reject(t('alreadyGuessed'));
      return null;
    }
    if (!isValidGuess(current, board.length)) {
      reject(t('notInWordList'));
      return null;
    }
    if (played.length >= MAX_ATTEMPTS) return null;

    const outcome = commitGuess(date, current);
    if (outcome.status !== 'accepted') {
      reject(outcome.status === 'board_unreadable' ? t('error') : t('notInWordList'));
      return null;
    }

    setCurrent('');
    if (hapticsOn && outcome.gameStatus !== 'in_progress') {
      Haptics.notificationAsync(
        outcome.gameStatus === 'won'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      );
    }
    return outcome.gameStatus;
  }, [board, commitGuess, current, date, hapticsOn, played.length, reject]);

  return {
    board,
    loading,
    source,
    current,
    played,
    keyboard,
    status,
    answer,
    shakeToken,
    message,
    clearMessage: () => setMessage(null),
    pressLetter,
    pressDelete,
    submit,
  };
}
