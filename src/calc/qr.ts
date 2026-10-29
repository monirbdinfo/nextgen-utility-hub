import { fail, ok, type Result } from './result';

/**
 * QR Code encoder (ISO/IEC 18004), byte mode only, versions 1–40, all four error-correction
 * levels. Pure and deterministic: the same text, level and mask always give the same symbol.
 * Text is encoded as UTF-8, so Bangla and emoji work. Nothing here touches the DOM or network.
 *
 * Correctness is checked in tests/calc/qr.test.ts by decoding the output with an independent
 * decoder (jsQR) for every version and level.
 */

export type EccLevel = 'L' | 'M' | 'Q' | 'H';
export const ECC_LEVELS: readonly EccLevel[] = ['L', 'M', 'Q', 'H'];

export interface QrSymbol {
  version: number;
  size: number;
  ecc: EccLevel;
  mask: number;
  /** modules[y][x] is true for a dark module. */
  modules: boolean[][];
}

export type QrError = 'empty' | 'too-long';

const ECC_INDEX: Record<EccLevel, number> = { L: 0, M: 1, Q: 2, H: 3 };
/** The two format-information bits for each level. */
const ECC_FORMAT_BITS: Record<EccLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };

// Index 0 is unused so the tables are indexed by version (1–40).
const ECC_CODEWORDS_PER_BLOCK: ReadonlyArray<ReadonlyArray<number>> = [
  [
    -1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30,
    30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
  [
    -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28,
    28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
  ],
  [
    -1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30,
    30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
  [
    -1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30,
    30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30,
  ],
];
const NUM_ERROR_CORRECTION_BLOCKS: ReadonlyArray<ReadonlyArray<number>> = [
  [
    -1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14,
    15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25,
  ],
  [
    -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23,
    25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49,
  ],
  [
    -1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34,
    34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68,
  ],
  [
    -1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35,
    37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81,
  ],
];

const MIN_VERSION = 1;
const MAX_VERSION = 40;

const sizeOf = (version: number): number => version * 4 + 17;

/** Number of data and error-correction modules in a symbol (everything except function patterns). */
function numRawDataModules(version: number): number {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) result -= 36;
  }
  return result;
}

/** Data codewords (bytes) a symbol of this version and level can carry. */
function numDataCodewords(version: number, ecc: EccLevel): number {
  const e = ECC_INDEX[ecc];
  return (
    Math.floor(numRawDataModules(version) / 8) -
    ECC_CODEWORDS_PER_BLOCK[e]![version]! * NUM_ERROR_CORRECTION_BLOCKS[e]![version]!
  );
}

/** Largest number of UTF-8 bytes a symbol can hold in byte mode. */
export function byteCapacity(version: number, ecc: EccLevel): number {
  const countBits = version <= 9 ? 8 : 16;
  return Math.floor((numDataCodewords(version, ecc) * 8 - 4 - countBits) / 8);
}

// ---------- Reed–Solomon over GF(2^8), polynomial 0x11D ----------

function gfMultiply(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsDivisor(degree: number): number[] {
  const result = new Array<number>(degree).fill(0);
  result[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      result[j] = gfMultiply(result[j]!, root);
      if (j + 1 < degree) result[j]! ^= result[j + 1]!;
    }
    root = gfMultiply(root, 0x02);
  }
  return result;
}

function rsRemainder(data: readonly number[], divisor: readonly number[]): number[] {
  const result = new Array<number>(divisor.length).fill(0);
  for (const b of data) {
    const factor = b ^ result.shift()!;
    result.push(0);
    divisor.forEach((coef, i) => {
      result[i]! ^= gfMultiply(coef, factor);
    });
  }
  return result;
}

// ---------- Symbol construction ----------

const bit = (x: number, i: number): boolean => ((x >>> i) & 1) !== 0;

function alignmentPositions(version: number): number[] {
  if (version === 1) return [];
  const numAlign = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result = [6];
  for (let pos = version * 4 + 10; result.length < numAlign; pos -= step) result.splice(1, 0, pos);
  return result;
}

class Builder {
  readonly size: number;
  readonly modules: boolean[][];
  readonly isFunction: boolean[][];

  constructor(readonly version: number) {
    this.size = sizeOf(version);
    this.modules = Array.from({ length: this.size }, () =>
      new Array<boolean>(this.size).fill(false),
    );
    this.isFunction = Array.from({ length: this.size }, () =>
      new Array<boolean>(this.size).fill(false),
    );
  }

  setFunction(x: number, y: number, dark: boolean): void {
    this.modules[y]![x] = dark;
    this.isFunction[y]![x] = true;
  }

  drawFunctionPatterns(): void {
    const { size, version } = this;
    for (let i = 0; i < size; i++) {
      this.setFunction(6, i, i % 2 === 0);
      this.setFunction(i, 6, i % 2 === 0);
    }
    this.drawFinder(3, 3);
    this.drawFinder(size - 4, 3);
    this.drawFinder(3, size - 4);
    const align = alignmentPositions(version);
    const n = align.length;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        // Skip the three corners that would overlap a finder pattern.
        if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue;
        this.drawAlignment(align[i]!, align[j]!);
      }
    }
    this.drawFormat(0, 0); // reserves the format area; real bits are drawn once the mask is known
    this.drawVersion();
  }

  private drawFinder(cx: number, cy: number): void {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const x = cx + dx;
        const y = cy + dy;
        if (x >= 0 && x < this.size && y >= 0 && y < this.size)
          this.setFunction(x, y, dist !== 2 && dist !== 4);
      }
    }
  }

  private drawAlignment(cx: number, cy: number): void {
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++)
        this.setFunction(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }

  drawFormat(eccBits: number, mask: number): void {
    const { size } = this;
    const data = (eccBits << 3) | mask;
    let rem = data;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const bits = ((data << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) this.setFunction(8, i, bit(bits, i));
    this.setFunction(8, 7, bit(bits, 6));
    this.setFunction(8, 8, bit(bits, 7));
    this.setFunction(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) this.setFunction(14 - i, 8, bit(bits, i));
    for (let i = 0; i < 8; i++) this.setFunction(size - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i++) this.setFunction(8, size - 15 + i, bit(bits, i));
    this.setFunction(8, size - 8, true); // the always-dark module
  }

  private drawVersion(): void {
    if (this.version < 7) return;
    let rem = this.version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (this.version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const dark = bit(bits, i);
      const a = this.size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.setFunction(a, b, dark);
      this.setFunction(b, a, dark);
    }
  }

  drawCodewords(data: readonly number[]): void {
    const { size } = this;
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < size; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const upward = ((right + 1) & 2) === 0;
          const y = upward ? size - 1 - vert : vert;
          if (!this.isFunction[y]![x]! && i < data.length * 8) {
            this.modules[y]![x] = bit(data[i >>> 3]!, 7 - (i & 7));
            i++;
          }
        }
      }
    }
  }

  applyMask(mask: number): void {
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        let invert: boolean;
        switch (mask) {
          case 0:
            invert = (x + y) % 2 === 0;
            break;
          case 1:
            invert = y % 2 === 0;
            break;
          case 2:
            invert = x % 3 === 0;
            break;
          case 3:
            invert = (x + y) % 3 === 0;
            break;
          case 4:
            invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
            break;
          case 5:
            invert = ((x * y) % 2) + ((x * y) % 3) === 0;
            break;
          case 6:
            invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
            break;
          default:
            invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
            break;
        }
        if (!this.isFunction[y]![x]! && invert) this.modules[y]![x] = !this.modules[y]![x]!;
      }
    }
  }

  /** The standard four-rule penalty score; the mask with the lowest score is used. */
  penalty(): number {
    const { size, modules: m } = this;
    let score = 0;
    const line = (get: (i: number) => boolean): void => {
      let run = 1;
      for (let i = 1; i < size; i++) {
        if (get(i) === get(i - 1)) {
          run++;
          if (run === 5) score += 3;
          else if (run > 5) score++;
        } else run = 1;
      }
      // Finder-like 1:1:3:1:1 patterns with four light modules on one side.
      for (let i = 0; i + 11 <= size; i++) {
        const w = Array.from({ length: 11 }, (_, k) => get(i + k));
        const a = [true, false, true, true, true, false, true, false, false, false, false];
        const b = [false, false, false, false, true, false, true, true, true, false, true];
        if (w.every((v, k) => v === a[k]) || w.every((v, k) => v === b[k])) score += 40;
      }
    };
    for (let y = 0; y < size; y++) line((x) => m[y]![x]!);
    for (let x = 0; x < size; x++) line((y) => m[y]![x]!);
    for (let y = 0; y < size - 1; y++)
      for (let x = 0; x < size - 1; x++) {
        const c = m[y]![x]!;
        if (c === m[y]![x + 1] && c === m[y + 1]![x] && c === m[y + 1]![x + 1]) score += 3;
      }
    let dark = 0;
    for (const row of m) for (const c of row) if (c) dark++;
    const total = size * size;
    score += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
    return score;
  }
}

/** Add error correction to the data codewords and interleave the blocks (ISO 18004 §7.6). */
function addEccAndInterleave(data: number[], version: number, ecc: EccLevel): number[] {
  const e = ECC_INDEX[ecc];
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[e]![version]!;
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[e]![version]!;
  const rawCodewords = Math.floor(numRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const divisor = rsDivisor(blockEccLen);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < numBlocks; i++) {
    const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
    k += dat.length;
    const eccBytes = rsRemainder(dat, divisor);
    if (i < numShortBlocks) dat.push(0); // placeholder so all blocks have the same length
    blocks.push(dat.concat(eccBytes));
  }
  const result: number[] = [];
  for (let i = 0; i < blocks[0]!.length; i++) {
    blocks.forEach((block, j) => {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) result.push(block[i]!);
    });
  }
  return result;
}

export interface EncodeOptions {
  ecc?: EccLevel;
  /** Force a mask (0–7). By default the best one is chosen. */
  mask?: number;
  /** Smallest version to use; the encoder still grows it if the text does not fit. */
  minVersion?: number;
}

/** Encode text as a QR symbol. Fails for empty text, or text longer than version 40 can hold. */
export function encodeQr(text: string, options: EncodeOptions = {}): Result<QrSymbol, QrError> {
  if (!text) return fail('empty');
  const ecc = options.ecc ?? 'M';
  const bytes = Array.from(new TextEncoder().encode(text));

  let version = Math.max(MIN_VERSION, options.minVersion ?? MIN_VERSION);
  while (version <= MAX_VERSION && bytes.length > byteCapacity(version, ecc)) version++;
  if (version > MAX_VERSION) return fail('too-long');

  // Data bits: mode (byte = 0100), character count, the bytes, terminator, padding.
  const bits: number[] = [];
  const push = (value: number, count: number): void => {
    for (let i = count - 1; i >= 0; i--) bits.push((value >>> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) push(b, 8);
  const capacityBits = numDataCodewords(version, ecc) * 8;
  push(0, Math.min(4, capacityBits - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let pad = 0xec; data.length < numDataCodewords(version, ecc); pad ^= 0xec ^ 0x11)
    data.push(pad);

  const builder = new Builder(version);
  builder.drawFunctionPatterns();
  builder.drawCodewords(addEccAndInterleave(data, version, ecc));

  let bestMask = options.mask ?? 0;
  if (options.mask === undefined) {
    let best = Infinity;
    for (let mask = 0; mask < 8; mask++) {
      builder.applyMask(mask);
      builder.drawFormat(ECC_FORMAT_BITS[ecc], mask);
      const score = builder.penalty();
      if (score < best) {
        best = score;
        bestMask = mask;
      }
      builder.applyMask(mask); // XOR again to undo
    }
  }
  builder.applyMask(bestMask);
  builder.drawFormat(ECC_FORMAT_BITS[ecc], bestMask);

  return ok({ version, size: builder.size, ecc, mask: bestMask, modules: builder.modules });
}

/** Quiet-zone width (in modules) the standard requires around a symbol. */
export const QUIET_ZONE = 4;

/**
 * An SVG path (`M x y h1 v1 h-1 z` per dark module, merged per row run) covering the symbol and
 * its quiet zone, in module units. Draw it black on white.
 */
export function toSvgPath(symbol: QrSymbol, quiet = QUIET_ZONE): string {
  const parts: string[] = [];
  symbol.modules.forEach((row, y) => {
    for (let x = 0; x < row.length;) {
      if (!row[x]) {
        x++;
        continue;
      }
      let end = x;
      while (end < row.length && row[end]) end++;
      parts.push(`M${x + quiet} ${y + quiet}h${end - x}v1h-${end - x}z`);
      x = end;
    }
  });
  return parts.join('');
}

/** Side length (in modules) of the symbol plus its quiet zone. */
export const totalModules = (symbol: QrSymbol, quiet = QUIET_ZONE): number =>
  symbol.size + quiet * 2;
