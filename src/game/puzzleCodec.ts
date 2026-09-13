const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const KEY = [0x57, 0x44, 0x72, 0x6f, 0x70]; // "WDrop"

/**
 * Light obfuscation for the answer in transit and at rest.
 *
 * This is not security and is not claimed to be: anyone determined can read the
 * app bundle. It exists so the answer is not sitting in plain text in a network
 * response or in a cache file that a curious player might scroll past by
 * accident, which would spoil the day's puzzle for them.
 */
function toBase64(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? '=' : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? '=' : B64[b2 & 63];
  }
  return out;
}

function fromBase64(input: string): number[] {
  const clean = input.replace(/=+$/, '');
  if (!/^[A-Za-z0-9+/]*$/.test(clean) || clean.length % 4 === 1) {
    throw new Error('decodeAnswer: payload is not valid base64');
  }
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    buffer = (buffer << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

const xor = (bytes: number[]): number[] =>
  bytes.map((b, i) => b ^ KEY[i % KEY.length]);

export function encodeAnswer(word: string): string {
  const upper = word.trim().toUpperCase();
  if (!/^[A-Z]{1,16}$/.test(upper)) throw new Error(`encodeAnswer: unusable word "${word}"`);
  return toBase64(xor([...upper].map((c) => c.charCodeAt(0))));
}

export function decodeAnswer(payload: string): string {
  const word = String.fromCharCode(...xor(fromBase64(payload)));
  if (!/^[A-Z]{1,16}$/.test(word)) {
    throw new Error('decodeAnswer: payload did not decode to a word');
  }
  return word;
}
