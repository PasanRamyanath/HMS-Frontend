/**
 * High-Contrast Apple-Styled SVG QR Code Generator for Room Service Stands & LankaQR.
 * Renders crisp 1024x1024 vector SVGs with rounded finder patterns, continuous squircle badge,
 * and SF Pro typography with .tabular-nums-lkr alignment.
 */

export type QrErrorCorrectionLevel = "L" | "M" | "Q" | "H";

export interface QrMatrix {
 readonly size: number;
 readonly modules: ReadonlyArray<ReadonlyArray<boolean>>;
}

export interface QrSvgOptions {
 readonly size?: number;
 readonly foregroundColor?: string;
 readonly backgroundColor?: string;
 readonly moduleRadius?: number;
 readonly centerBadgeText?: string;
 readonly centerBadgeSubtext?: string;
}

export interface RoomStandQrOptions {
 readonly hotelName: string;
 readonly roomNumber: string;
 readonly qrUrl: string;
 readonly guestInstructions?: string;
}

export interface LankaQrSvgOptions {
 readonly emvcoPayload: string;
 readonly merchantName: string;
 readonly amountLkr?: number | undefined;
}

// GF(256) Galois Field Galois Math Constants for Reed-Solomon
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);

(() => {
 let x = 1;
 for (let i = 0; i < 255; i++) {
 GF_EXP[i] = x;
 GF_LOG[x] = i;
 x <<= 1;
 if (x & 0x100) x ^= 0x11d;
 }
 for (let i = 255; i < 512; i++) {
 GF_EXP[i] = GF_EXP[i - 255] ?? 0;
 }
})();

function gfMul(a: number, b: number): number {
 if (a === 0 || b === 0) return 0;
 return GF_EXP[(GF_LOG[a] ?? 0) + (GF_LOG[b] ?? 0)] ?? 0;
}

function rsGeneratorPoly(numEcBytes: number): Uint8Array {
 let poly = new Uint8Array([1]);
 for (let i = 0; i < numEcBytes; i++) {
 const next = new Uint8Array(poly.length + 1);
 const factor = GF_EXP[i] ?? 0;
 for (let j = 0; j < poly.length; j++) {
 const pVal = poly[j] ?? 0;
 next[j] = (next[j] ?? 0) ^ gfMul(pVal, factor);
 next[j + 1] = (next[j + 1] ?? 0) ^ pVal;
 }
 poly = next;
 }
 return poly;
}

function rsEncode(data: Uint8Array, numEcBytes: number): Uint8Array {
 const gen = rsGeneratorPoly(numEcBytes);
 const remainder = new Uint8Array(numEcBytes);
 for (let i = 0; i < data.length; i++) {
 const factor = (data[i] ?? 0) ^ (remainder[0] ?? 0);
 remainder.copyWithin(0, 1);
 remainder[numEcBytes - 1] = 0;
 if (factor !== 0) {
 for (let j = 0; j < numEcBytes; j++) {
 remainder[j] = (remainder[j] ?? 0) ^ gfMul(gen[j] ?? 0, factor);
 }
 }
 }
 return remainder;
}

interface QrVersionSpec {
 readonly version: number;
 readonly size: number;
 readonly totalBytes: number;
 readonly dataBytes: number;
 readonly ecBytesPerBlock: number;
 readonly numBlocks: number;
 readonly alignCoords: ReadonlyArray<number>;
}

const QR_SPECS: ReadonlyArray<QrVersionSpec> = [
 {
 version: 1,
 size: 21,
 totalBytes: 26,
 dataBytes: 16,
 ecBytesPerBlock: 10,
 numBlocks: 1,
 alignCoords: [],
 },
 {
 version: 2,
 size: 25,
 totalBytes: 44,
 dataBytes: 28,
 ecBytesPerBlock: 16,
 numBlocks: 1,
 alignCoords: [6, 18],
 },
 {
 version: 3,
 size: 29,
 totalBytes: 70,
 dataBytes: 44,
 ecBytesPerBlock: 26,
 numBlocks: 1,
 alignCoords: [6, 22],
 },
 {
 version: 4,
 size: 33,
 totalBytes: 100,
 dataBytes: 64,
 ecBytesPerBlock: 18,
 numBlocks: 2,
 alignCoords: [6, 26],
 },
 {
 version: 5,
 size: 37,
 totalBytes: 134,
 dataBytes: 86,
 ecBytesPerBlock: 24,
 numBlocks: 2,
 alignCoords: [6, 30],
 },
 {
 version: 6,
 size: 41,
 totalBytes: 172,
 dataBytes: 108,
 ecBytesPerBlock: 16,
 numBlocks: 4,
 alignCoords: [6, 34],
 },
 {
 version: 7,
 size: 45,
 totalBytes: 196,
 dataBytes: 124,
 ecBytesPerBlock: 18,
 numBlocks: 4,
 alignCoords: [6, 22, 38],
 },
 {
 version: 8,
 size: 49,
 totalBytes: 242,
 dataBytes: 154,
 ecBytesPerBlock: 22,
 numBlocks: 4,
 alignCoords: [6, 24, 42],
 },
 {
 version: 9,
 size: 53,
 totalBytes: 292,
 dataBytes: 182,
 ecBytesPerBlock: 22,
 numBlocks: 5,
 alignCoords: [6, 26, 46],
 },
 {
 version: 10,
 size: 57,
 totalBytes: 346,
 dataBytes: 216,
 ecBytesPerBlock: 26,
 numBlocks: 5,
 alignCoords: [6, 28, 50],
 },
];

function selectQrVersion(dataLength: number): QrVersionSpec {
 for (const spec of QR_SPECS) {
 const requiredBytes = dataLength + 2;
 if (requiredBytes <= spec.dataBytes) {
 return spec;
 }
 }
 const defaultSpec = QR_SPECS[0] as QrVersionSpec;
 return QR_SPECS[QR_SPECS.length - 1] ?? defaultSpec;
}

function writeBitBuffer(
 buffer: Uint8Array,
 value: number,
 numBits: number,
 startOffset: number,
): number {
 let bitOffset = startOffset;
 for (let i = numBits - 1; i >= 0; i--) {
 const byteIdx = bitOffset >> 3;
 const bitPos = 7 - (bitOffset & 7);
 if (byteIdx < buffer.length) {
 buffer[byteIdx] = (buffer[byteIdx] ?? 0) | (((value >> i) & 1) << bitPos);
 }
 bitOffset++;
 }
 return bitOffset;
}

function encodeByteModeData(text: string, spec: QrVersionSpec): Uint8Array {
 const encoder = new TextEncoder();
 const rawBytes = encoder.encode(text);
 const buffer = new Uint8Array(spec.dataBytes);

 let offset = writeBitBuffer(buffer, 4, 4, 0); // Byte mode indicator: 0100
 const lengthBits = spec.version >= 10 ? 16 : 8;
 offset = writeBitBuffer(buffer, rawBytes.length, lengthBits, offset);

 for (const byte of rawBytes) {
 offset = writeBitBuffer(buffer, byte, 8, offset);
 }

 offset = writeBitBuffer(buffer, 0, 4, offset); // Terminator

 while (offset & 7) {
 offset = writeBitBuffer(buffer, 0, 1, offset);
 }

 const startByte = offset >> 3;
 for (let i = startByte; i < spec.dataBytes; i++) {
 buffer[i] = (i - startByte) % 2 === 0 ? 0xec : 0x11;
 }

 return buffer;
}

function interleaveBlocks(data: Uint8Array, spec: QrVersionSpec): Uint8Array {
 const blockSize = Math.floor(spec.dataBytes / spec.numBlocks);
 const ecSize = spec.ecBytesPerBlock;
 const blocks: Uint8Array[] = [];
 const ecBlocks: Uint8Array[] = [];

 for (let b = 0; b < spec.numBlocks; b++) {
 const blockData = data.slice(b * blockSize, (b + 1) * blockSize);
 blocks.push(blockData);
 ecBlocks.push(rsEncode(blockData, ecSize));
 }

 const result = new Uint8Array(spec.totalBytes);
 let outIdx = 0;

 for (let i = 0; i < blockSize; i++) {
 for (let b = 0; b < spec.numBlocks; b++) {
 result[outIdx++] = blocks[b]?.[i] ?? 0;
 }
 }

 for (let i = 0; i < ecSize; i++) {
 for (let b = 0; b < spec.numBlocks; b++) {
 result[outIdx++] = ecBlocks[b]?.[i] ?? 0;
 }
 }

 return result;
}

function safeSetModule(
 matrix: boolean[][],
 reserved: boolean[][],
 r: number,
 c: number,
 val: boolean,
): void {
 const row = matrix[r];
 const resRow = reserved[r];
 if (row && resRow && c >= 0 && c < row.length) {
 row[c] = val;
 resRow[c] = true;
 }
}

function isFinderBorderOrCenter(r: number, c: number): boolean {
 const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
 const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
 return isOuter || isInner;
}

function addSingleFinder(
 matrix: boolean[][],
 reserved: boolean[][],
 top: number,
 left: number,
): void {
 for (let r = 0; r < 7; r++) {
 for (let c = 0; c < 7; c++) {
 const val = isFinderBorderOrCenter(r, c);
 safeSetModule(matrix, reserved, top + r, left + c, val);
 }
 }
}

function addFinders(matrix: boolean[][], reserved: boolean[][], size: number): void {
 addSingleFinder(matrix, reserved, 0, 0);
 addSingleFinder(matrix, reserved, 0, size - 7);
 addSingleFinder(matrix, reserved, size - 7, 0);
}

function addTimingPatterns(matrix: boolean[][], reserved: boolean[][], size: number): void {
 for (let i = 8; i < size - 8; i++) {
 safeSetModule(matrix, reserved, 6, i, i % 2 === 0);
 safeSetModule(matrix, reserved, i, 6, i % 2 === 0);
 }
}

function addSingleAlignment(
 matrix: boolean[][],
 reserved: boolean[][],
 ar: number,
 ac: number,
): void {
 for (let r = -2; r <= 2; r++) {
 for (let c = -2; c <= 2; c++) {
 const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
 const isCenter = r === 0 && c === 0;
 safeSetModule(matrix, reserved, ar + r, ac + c, isBorder || isCenter);
 }
 }
}

function addAlignment(
 matrix: boolean[][],
 reserved: boolean[][],
 coords: ReadonlyArray<number>,
): void {
 for (const ar of coords) {
 for (const ac of coords) {
 if (!reserved[ar]?.[ac]) {
 addSingleAlignment(matrix, reserved, ar, ac);
 }
 }
 }
}

function reserveFormatAreas(matrix: boolean[][], reserved: boolean[][], size: number): void {
 for (let i = 0; i < 9; i++) {
 if (i !== 6) {
 safeSetModule(matrix, reserved, 8, i, false);
 safeSetModule(matrix, reserved, i, 8, false);
 safeSetModule(matrix, reserved, size - 1 - i, 8, false);
 safeSetModule(matrix, reserved, 8, size - 1 - i, false);
 }
 }
 safeSetModule(matrix, reserved, size - 8, 8, true);
}

function initMatrixWithPatterns(spec: QrVersionSpec): {
 matrix: boolean[][];
 reserved: boolean[][];
} {
 const size = spec.size;
 const matrix: boolean[][] = Array.from({ length: size }, () =>
 Array.from({ length: size }, () => false),
 );
 const reserved: boolean[][] = Array.from({ length: size }, () =>
 Array.from({ length: size }, () => false),
 );

 addFinders(matrix, reserved, size);
 addTimingPatterns(matrix, reserved, size);
 addAlignment(matrix, reserved, spec.alignCoords);
 reserveFormatAreas(matrix, reserved, size);

 return { matrix, reserved };
}

function getFormatCoord1(i: number): [number, number] {
 if (i < 6) return [8, i];
 if (i < 8) return [8, i + 1];
 return [14 - i, 8];
}

function getFormatCoord2(i: number, size: number): [number, number] {
 if (i < 8) return [size - 1 - i, 8];
 return [8, size - 15 + i];
}

function writeFormatBits(matrix: boolean[][], size: number): void {
 const formatBits = 0x5412;
 for (let i = 0; i < 15; i++) {
 const bit = ((formatBits >> i) & 1) === 1;
 const [r1, c1] = getFormatCoord1(i);
 const row1 = matrix[r1];
 if (row1) row1[c1] = bit;

 const [r2, c2] = getFormatCoord2(i, size);
 const row2 = matrix[r2];
 if (row2) row2[c2] = bit;
 }
}

function placeDataBitAt(
 matrix: boolean[][],
 data: Uint8Array,
 row: number,
 col: number,
 bitIdx: number,
): number {
 const rowArr = matrix[row];
 if (!rowArr) return bitIdx;

 let bit = false;
 const bytePos = bitIdx >> 3;
 if (bytePos < data.length) {
 bit = (((data[bytePos] ?? 0) >> (7 - (bitIdx & 7))) & 1) === 1;
 }
 if ((row + col) % 2 === 0) {
 bit = !bit;
 }
 rowArr[col] = bit;
 return bitIdx + 1;
}

function placeColumnPair(
 matrix: boolean[][],
 reserved: boolean[][],
 data: Uint8Array,
 size: number,
 right: number,
 upward: boolean,
 startBit: number,
): number {
 let bitIdx = startBit;
 for (let vert = 0; vert < size; vert++) {
 const row = upward ? size - 1 - vert : vert;
 const resArr = reserved[row];
 if (!resArr) continue;

 for (let c = 0; c < 2; c++) {
 const col = right - c;
 if (!resArr[col]) {
 bitIdx = placeDataBitAt(matrix, data, row, col, bitIdx);
 }
 }
 }
 return bitIdx;
}

function placeDataBits(
 matrix: boolean[][],
 reserved: boolean[][],
 data: Uint8Array,
 size: number,
): void {
 let bitIdx = 0;
 let upward = true;

 for (let right = size - 1; right > 0; right -= 2) {
 if (right === 6) right--; // skip vertical timing line
 bitIdx = placeColumnPair(matrix, reserved, data, size, right, upward, bitIdx);
 upward = !upward;
 }
}

/**
 * Generates pure QR Code matrix for arbitrary string payload.
 */
export function generateQrMatrix(text: string): QrMatrix {
 const spec = selectQrVersion(text.length);
 const encoded = encodeByteModeData(text, spec);
 const interleaved = interleaveBlocks(encoded, spec);
 const { matrix, reserved } = initMatrixWithPatterns(spec);

 placeDataBits(matrix, reserved, interleaved, spec.size);
 writeFormatBits(matrix, spec.size);

 return { size: spec.size, modules: matrix };
}

function isFinderArea(r: number, c: number, size: number): boolean {
 const isTL = r < 7 && c < 7;
 const isTR = r < 7 && c >= size - 7;
 const isBL = r >= size - 7 && c < 7;
 return isTL || isTR || isBL;
}

function renderDataModules(
 qr: QrMatrix,
 margin: number,
 cellSize: number,
 moduleRadius: number,
 fg: string,
): string {
 let svg = "";
 for (let r = 0; r < qr.size; r++) {
 for (let c = 0; c < qr.size; c++) {
 if (qr.modules[r]?.[c] && !isFinderArea(r, c, qr.size)) {
 const x = (c + margin) * cellSize;
 const y = (r + margin) * cellSize;
 svg += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" rx="${moduleRadius}" fill="${fg}"/>`;
 }
 }
 }
 return svg;
}

function renderFinderPatterns(
 positions: ReadonlyArray<{ readonly x: number; readonly y: number }>,
 cellSize: number,
 fg: string,
 bg: string,
): string {
 let svg = "";
 for (const pos of positions) {
 const finderSize = 7 * cellSize;
 const outerR = cellSize * 2;
 const innerR = cellSize * 1.5;
 const centerR = cellSize * 0.8;

 svg += `<rect x="${pos.x.toFixed(2)}" y="${pos.y.toFixed(2)}" width="${finderSize.toFixed(2)}" height="${finderSize.toFixed(2)}" rx="${outerR.toFixed(2)}" fill="${fg}"/>`;
 svg += `<rect x="${(pos.x + cellSize).toFixed(2)}" y="${(pos.y + cellSize).toFixed(2)}" width="${(5 * cellSize).toFixed(2)}" height="${(5 * cellSize).toFixed(2)}" rx="${innerR.toFixed(2)}" fill="${bg}"/>`;
 svg += `<rect x="${(pos.x + 2 * cellSize).toFixed(2)}" y="${(pos.y + 2 * cellSize).toFixed(2)}" width="${(3 * cellSize).toFixed(2)}" height="${(3 * cellSize).toFixed(2)}" rx="${centerR.toFixed(2)}" fill="${fg}"/>`;
 }
 return svg;
}

function renderCenterBadge(
 size: number,
 fg: string,
 bg: string,
 badgeText?: string,
 badgeSubtext?: string,
): string {
 if (!badgeText) return "";
 const badgeW = size * 0.34;
 const badgeH = size * 0.16;
 const badgeX = (size - badgeW) / 2;
 const badgeY = (size - badgeH) / 2;

 let svg = `<rect x="${badgeX}" y="${badgeY}" width="${badgeW}" height="${badgeH}" rx="24" fill="${bg}" stroke="${fg}" stroke-width="6"/>`;
 svg += `<text x="${size / 2}" y="${badgeY + badgeH * 0.52}" font-family="-apple-system, 'SF Pro Display', sans-serif" font-weight="700" font-size="${badgeH * 0.36}" text-anchor="middle" dominant-baseline="middle" fill="${fg}" class="tabular-nums-lkr">${badgeText}</text>`;
 if (badgeSubtext) {
 svg += `<text x="${size / 2}" y="${badgeY + badgeH * 0.8}" font-family="-apple-system, 'SF Pro Text', sans-serif" font-weight="500" font-size="${badgeH * 0.18}" text-anchor="middle" fill="#636366">${badgeSubtext}</text>`;
 }
 return svg;
}

/**
 * Generates crisp Apple HIG styled SVG from QR code matrix with rounded modules and finder patterns.
 */
export function generateQrSvg(content: string, options?: QrSvgOptions): string {
 const qr = generateQrMatrix(content);
 const size = options?.size ?? 1024;
 const fg = options?.foregroundColor ?? "#1c1c1e";
 const bg = options?.backgroundColor ?? "#ffffff";
 const moduleRadius = options?.moduleRadius ?? 1.5;

 const margin = 4;
 const totalGridSize = qr.size + margin * 2;
 const cellSize = size / totalGridSize;

 const baseBackground = `<rect width="${size}" height="${size}" rx="48" fill="${bg}"/>`;
 const modulesSvg = renderDataModules(qr, margin, cellSize, moduleRadius, fg);

 const finderPositions = [
 { x: margin * cellSize, y: margin * cellSize },
 { x: (qr.size - 7 + margin) * cellSize, y: margin * cellSize },
 { x: margin * cellSize, y: (qr.size - 7 + margin) * cellSize },
 ];
 const findersSvg = renderFinderPatterns(finderPositions, cellSize, fg, bg);
 const badgeSvg = renderCenterBadge(
 size,
 fg,
 bg,
 options?.centerBadgeText,
 options?.centerBadgeSubtext,
 );

 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${baseBackground}${modulesSvg}${findersSvg}${badgeSvg}</svg>`;
}

/**
 * Renders complete, print-ready acrylic/wood stand SVG for hotel guest rooms.
 */
export function renderRoomStandQrSvg(options: RoomStandQrOptions): string {
 const qrSvg = generateQrSvg(options.qrUrl, {
 size: 640,
 centerBadgeText: `ROOM ${options.roomNumber}`,
 centerBadgeSubtext: "SCAN TO ORDER",
 });

 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1400" width="1024" height="1400">
 <defs>
 <linearGradient id="standBg" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0%" stop-color="#ffffff"/>
 <stop offset="100%" stop-color="#f5f5f7"/>
 </linearGradient>
 </defs>
 <rect width="1024" height="1400" rx="48" fill="url(#standBg)" stroke="#e5e5ea" stroke-width="4"/>
 <rect x="64" y="64" width="896" height="1272" rx="36" fill="#ffffff" filter="drop-shadow(0 12px 32px rgba(0,0,0,0.06))"/>
 
 <!-- Hotel Header -->
 <text x="512" y="160" font-family="-apple-system, 'SF Pro Display', sans-serif" font-weight="800" font-size="44" text-anchor="middle" fill="#1c1c1e" letter-spacing="-0.5">${options.hotelName}</text>
 <rect x="412" y="196" width="200" height="40" rx="20" fill="#007aff" fill-opacity="0.12"/>
 <text x="512" y="222" font-family="-apple-system, 'SF Pro Text', sans-serif" font-weight="700" font-size="20" text-anchor="middle" fill="#007aff" class="tabular-nums-lkr">ROOM ${options.roomNumber}</text>

 <!-- Centered QR Code SVG -->
 <g transform="translate(192, 280)">
 ${qrSvg}
 </g>

 <!-- Instructions & Trilingual Prompt -->
 <text x="512" y="990" font-family="-apple-system, 'SF Pro Display', sans-serif" font-weight="700" font-size="32" text-anchor="middle" fill="#1c1c1e">Contactless Room Service</text>
 <text x="512" y="1036" font-family="-apple-system, 'SF Pro Text', sans-serif" font-weight="500" font-size="22" text-anchor="middle" fill="#8e8e93">Scan with your smartphone camera • No login required</text>
 <text x="512" y="1090" font-family="'Noto Sans Sinhala', 'Noto Sans Tamil', sans-serif" font-weight="500" font-size="20" text-anchor="middle" fill="#636366">ස්කෑන් කර ඇණවුම් කරන්න • ஸ்கேன் செய்து ஆர்டர் செய்க</text>

 <!-- Footer Branding -->
 <line x1="200" y1="1160" x2="824" y2="1160" stroke="#e5e5ea" stroke-width="2"/>
 <text x="512" y="1220" font-family="-apple-system, 'SF Pro Text', sans-serif" font-weight="500" font-size="18" text-anchor="middle" fill="#aeaeb2">LankaQR &amp; Guest QR Hospitality Platform</text>
</svg>`;
}

/**
 * Renders CBSL LankaQR EMVCo Payment QR Code SVG with official gold-and-blue badge.
 */
export function renderLankaQrSvg(options: LankaQrSvgOptions): string {
 const badgeText = options.amountLkr
 ? `LKR ${options.amountLkr.toLocaleString("en-LK", { minimumFractionDigits: 2 })}`
 : "LankaQR";

 const qrSvg = generateQrSvg(options.emvcoPayload, {
 size: 720,
 centerBadgeText: badgeText,
 centerBadgeSubtext: options.merchantName,
 });

 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1120" width="1024" height="1120">
 <rect width="1024" height="1120" rx="48" fill="#ffffff" stroke="#e5e5ea" stroke-width="4"/>
 <rect x="64" y="56" width="896" height="96" rx="28" fill="#ff9500" fill-opacity="0.15"/>
 <text x="512" y="118" font-family="-apple-system, 'SF Pro Display', sans-serif" font-weight="800" font-size="38" text-anchor="middle" fill="#d97706">CBSL LankaQR</text>
 
 <g transform="translate(152, 180)">
 ${qrSvg}
 </g>

 <text x="512" y="970" font-family="-apple-system, 'SF Pro Display', sans-serif" font-weight="700" font-size="28" text-anchor="middle" fill="#1c1c1e">${options.merchantName}</text>
 <text x="512" y="1016" font-family="-apple-system, 'SF Pro Text', sans-serif" font-weight="500" font-size="20" text-anchor="middle" fill="#8e8e93">Scan with any Sri Lankan Banking or Mobile Wallet App</text>
</svg>`;
}
