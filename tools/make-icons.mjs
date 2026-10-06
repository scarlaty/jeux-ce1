// Génère les icônes PNG de la PWA : `node tools/make-icons.mjs`.
// Outil ponctuel, hors application : aucune dépendance npm, aucun outil externe.
// La forme est la même que `icons/icon.svg` (carré bleu, étoile jaune) et les couleurs viennent
// de css/tokens.css (--primary, --star). Relancer après toute modification de icons/icon.svg.
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BG = [0x2f, 0x58, 0xcf];      // --primary
const STAR = [0xf5, 0xb7, 0x00];    // --star
const SAMPLES = 3;                  // suréchantillonnage (anticrénelage)

/** Icônes à produire. `radius` et `star` sont des fractions de la taille. */
const ICONS = [
  { file: 'icons/icon-192.png', size: 192, radius: 0.22, star: 0.34 },
  { file: 'icons/icon-512.png', size: 512, radius: 0.22, star: 0.34 },
  // Maskable : fond à bord perdu, contenu dans le cercle de sûreté (80 % de la largeur).
  { file: 'icons/icon-maskable-512.png', size: 512, radius: 0, star: 0.26 },
  // iOS ignore le manifeste et applique son propre masque arrondi.
  { file: 'icons/apple-touch-icon.png', size: 180, radius: 0, star: 0.3 },
];

/** Sommets d'une étoile à 5 branches (rayon intérieur = 0,382 × rayon extérieur). */
function starPoints(cx, cy, radius) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const angle = (-90 + i * 36) * (Math.PI / 180);
    const r = i % 2 === 0 ? radius : radius * 0.382;
    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return points;
}

function insidePolygon(points, x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function insideRoundedSquare(size, radius, x, y) {
  if (radius <= 0) return x >= 0 && y >= 0 && x <= size && y <= size;
  const dx = Math.max(radius - x, 0, x - (size - radius));
  const dy = Math.max(radius - y, 0, y - (size - radius));
  return dx * dx + dy * dy <= radius * radius;
}

/** Pixels RGBA de l'icône, calculés point par point puis moyennés. */
function renderIcon({ size, radius, star }) {
  const r = radius * size;
  const points = starPoints(size / 2, size / 2, star * size);
  const pixels = Buffer.alloc(size * size * 4);
  const step = 1 / SAMPLES;
  const total = SAMPLES * SAMPLES;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let bg = 0;
      let fg = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = px + (sx + 0.5) * step;
          const y = py + (sy + 0.5) * step;
          if (!insideRoundedSquare(size, r, x, y)) continue;
          bg += 1;
          if (insidePolygon(points, x, y)) fg += 1;
        }
      }
      const alpha = bg / total;
      const mix = bg > 0 ? fg / bg : 0;
      const at = (py * size + px) * 4;
      for (let c = 0; c < 3; c++) pixels[at + c] = Math.round(BG[c] + (STAR[c] - BG[c]) * mix);
      pixels[at + 3] = Math.round(alpha * 255);
    }
  }
  return pixels;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/** PNG 8 bits RGBA, filtre 0 sur chaque ligne. */
function encodePng(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;    // profondeur
  ihdr[9] = 6;    // RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(join(ROOT, 'icons'), { recursive: true });
for (const spec of ICONS) {
  const png = encodePng(spec.size, renderIcon(spec));
  writeFileSync(join(ROOT, spec.file), png);
  console.log(`${spec.file} — ${spec.size}×${spec.size}, ${png.length} octets`);
}
