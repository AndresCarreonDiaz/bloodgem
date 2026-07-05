// Generate seamless pixel-art floor textures (full-bleed, no chroma key) and
// slice each into 16 tile variants (64×64 → 4×4 grid of 16px tiles) for the
// renderer to break grid repetition. Also: player walk-stride frames.

import { existsSync } from 'node:fs';
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { runNanoBanana2, downloadTo } from './lib/replicate.mjs';
import { loadEnv } from './lib/env.mjs';

const { REPLICATE_API_TOKEN: KEY } = loadEnv();

const BASE = 'Seamless pixel art game texture, straight top-down view, crisp chunky pixels at roughly 64x64 pixel resolution scaled up, muted dark gothic palette, subtle variation across the surface, NO objects, NO creatures, NO text, NO borders, flat ambient lighting, the texture fills the ENTIRE image edge to edge and tiles seamlessly.';

const TEXTURES = [
  { name: 'tex_cobble', prompt: `${BASE} Material: dark Victorian cobblestone street, rounded grey-blue stones with thin dark mortar gaps, a few cracked stones.` },
  { name: 'tex_flagstone', prompt: `${BASE} Material: large rectangular flagstone pavement, cold grey stone slabs with faint moss in some seams, slightly lighter than cobblestone.` },
  { name: 'tex_canal', prompt: `${BASE} Material: dark still canal water, near-black deep green-blue with very faint ripple highlights and occasional floating debris flecks.` },
  { name: 'tex_minerock', prompt: `${BASE} Material: dark mine floor of packed red-brown rock and gravel, occasional tiny embedded red crystal glints.` },
  { name: 'tex_planks', prompt: `${BASE} Material: aged dark wooden scaffold planks running vertically, visible grain and nail heads, gaps between boards showing darkness.` },
  { name: 'tex_minehead', prompt: `${BASE} Material: hard-packed dark earth and flat stone of an industrial mine yard, boot-worn, with faint cart-wheel ruts.` },
];

await mkdir('public/tiles', { recursive: true });
await mkdir('assets/tiles', { recursive: true });

const jobs = TEXTURES.filter((t) => !existsSync(`assets/tiles/${t.name}.png`)).map((t) => async () => {
  const url = await runNanoBanana2({ apiKey: KEY, prompt: t.prompt, aspectRatio: '1:1', resolution: '1K', outputFormat: 'png' });
  await downloadTo(url, `assets/tiles/${t.name}.png`);
  console.log('texture ok:', t.name);
});
await Promise.all(jobs.map((j) => j()));

// downscale each to 64×64 (a 4×4 grid of 16px tile variants)
for (const t of TEXTURES) {
  await sharp(`assets/tiles/${t.name}.png`)
    .resize(64, 64, { kernel: 'nearest' })
    .png()
    .toFile(`public/tiles/${t.name}.png`);
  console.log('sliced →', t.name);
}
console.log('textures done');
