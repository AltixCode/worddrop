import { evaluateGuess, mergeKeyboardStates } from '../evaluateGuess';

describe('evaluateGuess', () => {
  it('marks an exact match as all correct', () => {
    expect(evaluateGuess('SCENE', 'SCENE')).toEqual([
      'correct', 'correct', 'correct', 'correct', 'correct',
    ]);
  });

  it('marks a letter in the wrong position as present', () => {
    expect(evaluateGuess('ACTOR', 'TRACK')).toEqual([
      'present', 'present', 'present', 'absent', 'present',
    ]);
  });

  it('marks letters absent from the answer', () => {
    expect(evaluateGuess('FILMS', 'ZZZZZ')).toEqual([
      'absent', 'absent', 'absent', 'absent', 'absent',
    ]);
  });

  // The duplicate-letter rule is the single most common bug in this genre:
  // a repeated guess letter may only consume as many answer letters as exist.
  it('does not credit a duplicate guess letter beyond the answer count', () => {
    // Answer has one E. The guess has two; the positionally correct one wins.
    expect(evaluateGuess('EERIE', 'THEME')).toEqual([
      'present', 'absent', 'absent', 'absent', 'correct',
    ]);
  });

  it('prefers exact positions over earlier occurrences of the same letter', () => {
    // Answer ABBEY has two Bs; guess BOBBY should light the two that align.
    expect(evaluateGuess('BOBBY', 'ABBEY')).toEqual([
      'present', 'absent', 'correct', 'absent', 'correct',
    ]);
  });

  it('marks a second copy absent when the answer holds only one', () => {
    expect(evaluateGuess('ALLOY', 'ALIEN')).toEqual([
      'correct', 'correct', 'absent', 'absent', 'absent',
    ]);
  });

  it('is case-insensitive and normalises to upper case input', () => {
    expect(evaluateGuess('scene', 'SCENE')).toEqual(evaluateGuess('SCENE', 'scene'));
  });

  it('works at every supported word length', () => {
    expect(evaluateGuess('CAST', 'CAST')).toHaveLength(4);
    expect(evaluateGuess('DIRECTS', 'DIRECTS')).toHaveLength(7);
  });

  it('refuses a guess whose length differs from the answer', () => {
    expect(() => evaluateGuess('CAST', 'SCENE')).toThrow(/length/i);
  });

  it('refuses an empty guess', () => {
    expect(() => evaluateGuess('', '')).toThrow();
  });
});

describe('mergeKeyboardStates', () => {
  it('returns an empty map for no guesses', () => {
    expect(mergeKeyboardStates([])).toEqual({});
  });

  it('keeps the strongest state seen for a letter', () => {
    const states = mergeKeyboardStates([
      { guess: 'ACTOR', states: evaluateGuess('ACTOR', 'TRACK') },
      { guess: 'TRACK', states: evaluateGuess('TRACK', 'TRACK') },
    ]);
    expect(states.T).toBe('correct');
    expect(states.R).toBe('correct');
    expect(states.O).toBe('absent');
  });

  it('never downgrades correct to present or absent', () => {
    const states = mergeKeyboardStates([
      { guess: 'SCENE', states: evaluateGuess('SCENE', 'SCENE') },
      { guess: 'SEEDS', states: evaluateGuess('SEEDS', 'SCENE') },
    ]);
    expect(states.S).toBe('correct');
  });
});
