import { encodeAnswer, decodeAnswer } from '../puzzleCodec';

describe('puzzleCodec', () => {
  it('round-trips a word', () => {
    for (const w of ['SCENE', 'CAST', 'DIRECTS', 'ZZZZZZ']) {
      expect(decodeAnswer(encodeAnswer(w))).toBe(w);
    }
  });

  it('does not leave the word readable in the payload', () => {
    expect(encodeAnswer('SCENE')).not.toContain('SCENE');
  });

  it('is deterministic, so a cached payload stays valid', () => {
    expect(encodeAnswer('SCENE')).toBe(encodeAnswer('SCENE'));
  });

  it('throws on a corrupted payload rather than returning nonsense', () => {
    expect(() => decodeAnswer('not base64 !!')).toThrow();
  });
});
