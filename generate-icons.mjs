/**
 * generate-icons.mjs
 * Generate PNG icons untuk PWA dalam 8 ukuran standar.
 * Menggunakan sharp (jika tersedia) atau fallback ke canvas manual via jimp.
 * Sumber: public/pwa-512x512.png yang sudah ada.
 *
 * Jalankan: node generate-icons.mjs
 */

import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const OUT_DIR = path.join(__dirname, 'public', 'icons');
const BG_COLOR = '#1a1a2e';
const ACCENT_COLOR = '#6366f1'; // indigo

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background gradient (dark navy)
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, '#16213e');
  grad.addColorStop(1, '#0f0e17');
  ctx.fillStyle = grad;

  // Rounded square background (maskable safe zone = inner 80%)
  const radius = size * 0.18;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();

  // Outer ring accent
  const ringWidth = Math.max(2, size * 0.025);
  ctx.strokeStyle = ACCENT_COLOR;
  ctx.lineWidth = ringWidth;
  ctx.beginPath();
  ctx.roundRect(ringWidth / 2, ringWidth / 2, size - ringWidth, size - ringWidth, radius - ringWidth / 2);
  ctx.stroke();

  // Scissors icon (simplified — 2 lines representing blades)
  const cx = size / 2;
  const cy = size / 2;
  const iconSize = size * 0.42;

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, size * 0.04);
  ctx.lineCap = 'round';

  // Upper blade
  ctx.beginPath();
  ctx.moveTo(cx - iconSize * 0.55, cy - iconSize * 0.5);
  ctx.lineTo(cx + iconSize * 0.45, cy + iconSize * 0.18);
  ctx.stroke();

  // Lower blade
  ctx.beginPath();
  ctx.moveTo(cx - iconSize * 0.55, cy + iconSize * 0.5);
  ctx.lineTo(cx + iconSize * 0.45, cy - iconSize * 0.18);
  ctx.stroke();

  // Pivot circle
  ctx.fillStyle = ACCENT_COLOR;
  const pivotR = Math.max(3, size * 0.055);
  ctx.beginPath();
  ctx.arc(cx - iconSize * 0.05, cy, pivotR, 0, Math.PI * 2);
  ctx.fill();

  // Handle circles (bottom of scissors)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, size * 0.03);
  const handleR = Math.max(4, size * 0.1);
  // Upper handle
  ctx.beginPath();
  ctx.arc(cx - iconSize * 0.55, cy - iconSize * 0.5, handleR, 0, Math.PI * 2);
  ctx.stroke();
  // Lower handle
  ctx.beginPath();
  ctx.arc(cx - iconSize * 0.55, cy + iconSize * 0.5, handleR, 0, Math.PI * 2);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

for (const size of SIZES) {
  const buf = generateIcon(size);
  const outPath = path.join(OUT_DIR, `icon-${size}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`✅ Generated ${outPath} (${size}x${size})`);
}

console.log('\n🎉 All icons generated in public/icons/');
