#!/usr/bin/env node
/**
 * Draws the WordDrop mark and writes every icon asset the two stores need.
 *
 * There is no image library in this toolchain and no binary art in the repo, so
 * the mark is rasterised here — a "W" stroked from a polyline, supersampled 4×
 * for smooth edges, over a square ground — and written as a PNG through
 * zlib. Re-running reproduces the files byte for byte, so an icon change is a
 * code change rather than an untracked asset someone exported once.
 *
 * Usage: node scripts/make-icons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'assets');

const GROUND = [11, 15, 22, 255]; // #0B0F16, the app's dark background
const MARK = [245, 247, 250, 255]; // #F5F7FA
const ACCENT = [62, 169, 106, 255]; // the board's "correct" green
const SS = 4; // supersampling factor

/** The "W", as a polyline in a unit square, plus the dot that follows it. */
const W_POINTS = [
  [0.16, 0.3],
  [0.33, 0.72],
  [0.5, 0.45],
  [0.67, 0.72],
  [0.84, 0.3],
];

const dist2ToSegment = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  const tRaw = lenSq === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / lenSq;
  const t = Math.max(0, Math.min(1, tRaw));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return (px - cx) ** 2 + (py - cy) ** 2;
};

const blend = (dst, i, color, alpha) => {
  for (let c = 0; c < 3; c += 1) {
    dst[i + c] = Math.round(dst[i + c] * (1 - alpha) + color[c] * alpha);
  }
  dst[i + 3] = Math.round(dst[i + 3] * (1 - alpha) + color[3] * alpha);
};

/**
 * @param {number} size          output edge in pixels
 * @param {object} options
 * @param {boolean} options.ground  paint the background, or leave it transparent
 * @param {number[]} options.mark   stroke colour
 * @param {boolean} options.dot     draw the accent square after the W
 * @param {number} options.inset    fraction of the edge left as padding
 */
function renderIcon(size, { ground = true, mark = MARK, dot = true, inset = 0 } = {}) {
  const pixels = Buffer.alloc(size * size * 4, 0);

  if (ground) {
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = GROUND[0];
      pixels[i + 1] = GROUND[1];
      pixels[i + 2] = GROUND[2];
      pixels[i + 3] = 255;
    }
  }

  const scale = 1 - inset * 2;
  const toX = (u) => (inset + u * scale) * size;
  const toY = (v) => (inset + v * scale) * size;
  const segments = W_POINTS.slice(0, -1).map((p, i) => [
    toX(p[0]),
    toY(p[1]),
    toX(W_POINTS[i + 1][0]),
    toY(W_POINTS[i + 1][1]),
  ]);
  const stroke = size * 0.085 * scale;
  const strokeSq = stroke * stroke;

  const dotX = toX(0.84);
  const dotY = toY(0.3);
  const dotR = size * 0.105 * scale;
  const dotRadius = size * 0.034 * scale;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let markHits = 0;
      let dotHits = 0;
      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const px = x + (sx + 0.5) / SS;
          const py = y + (sy + 0.5) / SS;
          const near = segments.some((s) => dist2ToSegment(px, py, s[0], s[1], s[2], s[3]) <= strokeSq);
          if (near) markHits += 1;
          if (dot) {
            // A rounded square sitting on the end of the last stroke.
            const dx = Math.abs(px - dotX) - (dotR - dotRadius);
            const dy = Math.abs(py - dotY) - (dotR - dotRadius);
            const outside = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
            if (outside - dotRadius <= 0) dotHits += 1;
          }
        }
      }
      const i = (y * size + x) * 4;
      const total = SS * SS;
      if (markHits) blend(pixels, i, mark, markHits / total);
      if (dotHits) blend(pixels, i, ACCENT, dotHits / total);
    }
  }

  return pixels;
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0; // filter type 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

const write = (name, size, options) => {
  const file = path.join(OUT, name);
  fs.writeFileSync(file, encodePng(size, size, renderIcon(size, options)));
  console.log(`make-icons: ${name} (${size}×${size})`);
};

fs.mkdirSync(OUT, { recursive: true });

// App Store and Play require a square icon with no alpha and no baked corners.
write('icon.png', 1024, { ground: true, inset: 0.14 });
write('favicon.png', 96, { ground: true, inset: 0.12 });
// Android adaptive icon: the foreground is inset well inside the safe zone,
// because the launcher masks up to 33% of the edge away.
write('android-icon-foreground.png', 1024, { ground: false, inset: 0.27 });
write('android-icon-background.png', 1024, { ground: true, inset: 0.5, dot: false, mark: GROUND });
write('android-icon-monochrome.png', 1024, {
  ground: false,
  inset: 0.27,
  dot: false,
  mark: [255, 255, 255, 255],
});
// Splash: transparent, drawn over the splash background colour from app.json.
write('splash-icon.png', 512, { ground: false, inset: 0.18 });
