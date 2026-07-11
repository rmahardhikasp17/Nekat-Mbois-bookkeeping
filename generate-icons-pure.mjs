/**
 * generate-icons-pure.mjs
 * Generate PNG icons tanpa dependency eksternal.
 * Membuat PNG valid dengan pixel art murni (pure JS PNG encoder).
 *
 * Jalankan: node generate-icons-pure.mjs
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUT_DIR = path.join(__dirname, 'public', 'icons');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

// ─── Minimal PNG encoder ──────────────────────────────────────────────────────

function crc32(buf) {
  let c = 0xffffffff;
  const table = [];
  for (let i = 0; i < 256; i++) {
    let k = i;
    for (let j = 0; j < 8; j++) k = (k & 1) ? 0xedb88320 ^ (k >>> 1) : k >>> 1;
    table[i] = k;
  }
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeArr = Buffer.from(type, 'ascii');
  const combined = Buffer.concat([typeArr, data]);
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, combined, crc]);
}

function encodePNG(width, height, pixels) {
  // pixels: Uint8Array, RGBA, row-major
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type RGB (we'll handle alpha manually)
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Build raw image data (filter byte + row)
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 4)] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * (1 + width * 4) + 1 + x * 4;
      raw[dstIdx]     = pixels[srcIdx];
      raw[dstIdx + 1] = pixels[srcIdx + 1];
      raw[dstIdx + 2] = pixels[srcIdx + 2];
      raw[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 6 });

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function setPixel(pixels, width, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= width || y >= width) return;
  const idx = (y * width + x) * 4;
  // Alpha blending over existing pixel
  const srcA = a / 255;
  const dstA = pixels[idx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA === 0) return;
  pixels[idx]     = Math.round((r * srcA + pixels[idx]     * dstA * (1 - srcA)) / outA);
  pixels[idx + 1] = Math.round((g * srcA + pixels[idx + 1] * dstA * (1 - srcA)) / outA);
  pixels[idx + 2] = Math.round((b * srcA + pixels[idx + 2] * dstA * (1 - srcA)) / outA);
  pixels[idx + 3] = Math.round(outA * 255);
}

function fillRect(pixels, w, x0, y0, x1, y1, r, g, b, a = 255) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      setPixel(pixels, w, x, y, r, g, b, a);
}

function fillCircle(pixels, w, cx, cy, radius, r, g, b, a = 255) {
  const r2 = radius * radius;
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r2)
        setPixel(pixels, w, x, y, r, g, b, a);
    }
  }
}

function drawLine(pixels, w, x0, y0, x1, y1, r, g, b, thickness = 1) {
  // Bresenham + thickness
  const half = Math.floor(thickness / 2);
  const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let cx = x0, cy = y0;
  while (true) {
    // Paint thick line by filling a small square
    for (let ty = -half; ty <= half; ty++)
      for (let tx = -half; tx <= half; tx++)
        setPixel(pixels, w, cx + tx, cy + ty, r, g, b);
    if (cx === x1 && cy === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; cx += sx; }
    if (e2 <= dx) { err += dx; cy += sy; }
  }
}

// Rounded rectangle (outline)
function strokeRoundRect(pixels, w, x, y, rw, rh, radius, r, g, b, thickness = 1) {
  // Straight edges
  drawLine(pixels, w, x + radius, y, x + rw - radius, y, r, g, b, thickness);           // top
  drawLine(pixels, w, x + radius, y + rh, x + rw - radius, y + rh, r, g, b, thickness); // bottom
  drawLine(pixels, w, x, y + radius, x, y + rh - radius, r, g, b, thickness);           // left
  drawLine(pixels, w, x + rw, y + radius, x + rw, y + rh - radius, r, g, b, thickness); // right

  // Corners (quarter arcs)
  const drawArc = (cx, cy, startAngle, endAngle) => {
    for (let a = startAngle; a <= endAngle; a += 0.5) {
      const rad = a * Math.PI / 180;
      const px = Math.round(cx + radius * Math.cos(rad));
      const py = Math.round(cy + radius * Math.sin(rad));
      for (let ty = -Math.floor(thickness / 2); ty <= Math.floor(thickness / 2); ty++)
        for (let tx = -Math.floor(thickness / 2); tx <= Math.floor(thickness / 2); tx++)
          setPixel(pixels, w, px + tx, py + ty, r, g, b);
    }
  };
  drawArc(x + radius,      y + radius,      180, 270);
  drawArc(x + rw - radius, y + radius,      270, 360);
  drawArc(x + rw - radius, y + rh - radius, 0,   90);
  drawArc(x + radius,      y + rh - radius, 90,  180);
}

// Fill rounded rect
function fillRoundRect(pixels, w, x0, y0, x1, y1, radius, r, g, b, a = 255) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      // Check if inside rounded corners
      const inCornerTL = x < x0 + radius && y < y0 + radius;
      const inCornerTR = x > x1 - radius && y < y0 + radius;
      const inCornerBL = x < x0 + radius && y > y1 - radius;
      const inCornerBR = x > x1 - radius && y > y1 - radius;

      if (inCornerTL) {
        const dx = x - (x0 + radius), dy = y - (y0 + radius);
        if (dx * dx + dy * dy > radius * radius) continue;
      } else if (inCornerTR) {
        const dx = x - (x1 - radius), dy = y - (y0 + radius);
        if (dx * dx + dy * dy > radius * radius) continue;
      } else if (inCornerBL) {
        const dx = x - (x0 + radius), dy = y - (y1 - radius);
        if (dx * dx + dy * dy > radius * radius) continue;
      } else if (inCornerBR) {
        const dx = x - (x1 - radius), dy = y - (y1 - radius);
        if (dx * dx + dy * dy > radius * radius) continue;
      }

      setPixel(pixels, w, x, y, r, g, b, a);
    }
  }
}

// ─── Icon renderer ────────────────────────────────────────────────────────────

function generateIcon(size) {
  const pixels = new Uint8Array(size * size * 4); // init transparent

  const BG   = [15,  14,  23,  255]; // #0f0e17
  const BG2  = [22,  33,  62,  255]; // #16213e
  const RING = [99,  102, 241, 255]; // #6366f1 indigo
  const WHITE = [255, 255, 255, 255];
  const ACC  = [99,  102, 241, 255]; // indigo pivot

  const radius = Math.round(size * 0.18);
  const thick  = Math.max(2, Math.round(size * 0.025));

  // 1. Fill background with rounded rect (gradient approximated as two halves)
  fillRoundRect(pixels, size, 0, 0, size - 1, size / 2, radius, BG2[0], BG2[1], BG2[2]);
  fillRoundRect(pixels, size, 0, size / 2, size - 1, size - 1, radius, BG[0],  BG[1],  BG[2]);

  // 2. Accent ring
  strokeRoundRect(pixels, size, thick, thick, size - 1 - thick, size - 1 - thick, radius - thick, RING[0], RING[1], RING[2], thick);

  // 3. Scissors icon
  const cx = Math.round(size / 2);
  const cy = Math.round(size / 2);
  const is = Math.round(size * 0.38); // icon scale
  const lw = Math.max(2, Math.round(size * 0.04)); // line width

  // Pivot
  const px_ = cx - Math.round(is * 0.05);
  fillCircle(pixels, size, px_, cy, Math.round(size * 0.055), ACC[0], ACC[1], ACC[2]);

  // Blades
  const ax0 = cx - Math.round(is * 0.52), ay0_up = cy - Math.round(is * 0.48);
  const ax1 = cx + Math.round(is * 0.44), ay1_up = cy + Math.round(is * 0.17);
  drawLine(pixels, size, ax0, ay0_up, ax1, ay1_up, WHITE[0], WHITE[1], WHITE[2], lw);

  const ay0_dn = cy + Math.round(is * 0.48);
  const ay1_dn = cy - Math.round(is * 0.17);
  drawLine(pixels, size, ax0, ay0_dn, ax1, ay1_dn, WHITE[0], WHITE[1], WHITE[2], lw);

  // Handles (circles at grip end)
  const handleR = Math.max(4, Math.round(size * 0.1));
  // Draw hollow circle (ring) for handles
  const drawHandleRing = (hcx, hcy) => {
    const r2out = handleR * handleR;
    const r2in  = (handleR - lw) * (handleR - lw);
    for (let y = hcy - handleR - 1; y <= hcy + handleR + 1; y++) {
      for (let x = hcx - handleR - 1; x <= hcx + handleR + 1; x++) {
        const d2 = (x - hcx) * (x - hcx) + (y - hcy) * (y - hcy);
        if (d2 <= r2out && d2 >= r2in) setPixel(pixels, size, x, y, WHITE[0], WHITE[1], WHITE[2]);
      }
    }
  };
  drawHandleRing(ax0, ay0_up);
  drawHandleRing(ax0, ay0_dn);

  return encodePNG(size, size, pixels);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

for (const size of SIZES) {
  const buf = generateIcon(size);
  const outPath = path.join(OUT_DIR, `icon-${size}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`✅ ${outPath}  (${buf.length} bytes)`);
}

console.log('\n🎉 All icons generated in public/icons/');
