import { useEffect, useState } from 'react';

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Time until the next local midnight, as `HH:MM:SS`.
 *
 * Local, not UTC: the puzzle is published at UTC midnight so everyone plays the
 * same board, but "tomorrow" for a player is their own next midnight, and a
 * countdown that disagreed with their clock would read as a bug.
 */
export function useMidnightCountdown(): string {
  const [label, setLabel] = useState('');

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const remaining = Math.max(0, midnight.getTime() - now.getTime());
      const hours = Math.floor(remaining / 3_600_000);
      const minutes = Math.floor((remaining % 3_600_000) / 60_000);
      const seconds = Math.floor((remaining % 60_000) / 1000);
      setLabel(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  return label;
}
