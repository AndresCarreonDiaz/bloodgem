// Trim transparent borders and downscale keyed sprites to in-game size
// (nearest-neighbor to keep pixels crisp). Outputs to public/sprites/.

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const JOBS = [
  { src: 'player_s', h: 26 },
  { src: 'player_n', h: 26 },
  { src: 'player_e', h: 26 },
  { src: 'player_w', h: 26 },
  { src: 'rabble_s', h: 24 },
  { src: 'watchman_s', h: 26 },
  { src: 'hound_s', h: 16 },
  { src: 'brute_s', h: 42 },
  { src: 'priest_s', h: 27 },
  { src: 'husk_s', h: 26 },
  { src: 'chorister_s', h: 22 },
  { src: 'mother_s', h: 58 },
  { src: 'mother2_s', h: 58 },
  { src: 'grist_s', h: 40 },
  { src: 'player_s_b', h: 26 },
  { src: 'player_n_b', h: 26 },
  { src: 'player_e_b', h: 26 },
  { src: 'player_w_b', h: 26 },
  { src: 'cassar_s', h: 27 },
  { src: 'maud_s', h: 20 },
  { src: 'verne_s', h: 30 },
  { src: 'sissel_s', h: 18 },
  { src: 'broker_s', h: 24 },
  { src: 'dunhill_s', h: 26 },
];

await mkdir('public/sprites', { recursive: true });
for (const j of JOBS) {
  const out = `public/sprites/${j.src}.png`;
  await sharp(`assets/sprites/${j.src}.png`)
    .trim()
    .resize({ height: j.h, kernel: 'nearest' })
    .png()
    .toFile(out);
  const meta = await sharp(out).metadata();
  console.log(j.src, '→', `${meta.width}x${meta.height}`);
}
