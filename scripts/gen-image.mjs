// Generate a game image via nano-banana-2, with optional green-screen chroma-key
// (the model cannot output alpha — see docs/research/nano-banana-2-replicate.md).
// Usage:
//   node scripts/gen-image.mjs --out assets/sprites/x.png --prompt "..." \
//        [--ref url_or_path ...] [--key] [--ar 1:1] [--res 1K]

import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { runNanoBanana2, downloadTo } from './lib/replicate.mjs';
import { loadEnv } from './lib/env.mjs';

const { REPLICATE_API_TOKEN: KEY } = loadEnv();

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
function args(name) {
  const out = [];
  for (let i = 0; i < process.argv.length; i++)
    if (process.argv[i] === `--${name}`) out.push(process.argv[i + 1]);
  return out;
}

const outPath = arg('out');
const prompt = arg('prompt');
const doKey = process.argv.includes('--key');
if (!outPath || !prompt) {
  console.error('need --out and --prompt');
  process.exit(1);
}

// local reference files are inlined as data URIs (replicate accepts them)
const refs = args('ref').map((r) => {
  if (r.startsWith('http')) return r;
  const b64 = readFileSync(r).toString('base64');
  return `data:image/png;base64,${b64}`;
});

const url = await runNanoBanana2({
  apiKey: KEY,
  prompt,
  imageInput: refs,
  aspectRatio: arg('ar', '1:1'),
  resolution: arg('res', '1K'),
  outputFormat: 'png',
});

const raw = outPath.replace(/\.png$/, '.raw.png');
await downloadTo(url, doKey ? raw : outPath);

if (doKey) {
  await chromaKey(raw, outPath);
  console.log('keyed →', outPath);
} else {
  console.log('saved →', outPath);
}

// HSV green-screen key: hue 120°±30, sat > 0.25, val > 0.2 → transparent.
// Slightly wider hue band than the reference recipe; our palette has no greens.
async function chromaKey(inPath, out) {
  const img = sharp(inPath);
  const { width, height } = await img.metadata();
  const buf = await img.ensureAlpha().raw().toBuffer();
  for (let i = 0; i < buf.length; i += 4) {
    const r = buf[i] / 255, g = buf[i + 1] / 255, b = buf[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const v = max, s = max === 0 ? 0 : (max - min) / max;
    let h = 0;
    if (max !== min) {
      if (max === g) h = 60 * (2 + (b - r) / (max - min));
      else if (max === r) h = 60 * ((g - b) / (max - min));
      else h = 60 * (4 + (r - g) / (max - min));
      if (h < 0) h += 360;
    }
    if (h > 90 && h < 150 && s > 0.25 && v > 0.2) buf[i + 3] = 0;
  }
  await sharp(buf, { raw: { width, height, channels: 4 } }).png().toFile(out);
}
