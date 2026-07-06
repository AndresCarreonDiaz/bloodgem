// Trim + downscale keyed sprites to in-game size → public/sprites/.
// p2_* sources are the painterly (Diablo-style) set at the 480×270 camera
// scale; entities not yet repainted use their old sources, scaled up ~30%
// to keep proportions consistent until their painterly pass lands.

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const JOBS = [
  // painterly player set
  ...['player_s', 'player_n', 'player_e', 'player_w',
      'player_s_b', 'player_n_b', 'player_e_b', 'player_w_b',
      'player_s_c', 'player_n_c', 'player_e_c', 'player_w_c'].map((n) => ({ src: `p2_${n}`, out: n, h: 34 })),
  ...['atk_s_a', 'atk_s_b', 'atk_n_a', 'atk_n_b',
      'atk_e_a', 'atk_e_b', 'atk_w_a', 'atk_w_b'].map((n) => ({ src: `p2_${n}`, out: n, h: 35 })),
  // painterly core enemies
  { src: 'p2_rabble_s', out: 'rabble_s', h: 31 },
  { src: 'p2_rabble_s_b', out: 'rabble_s_b', h: 31 },
  { src: 'p2_husk_s_b', out: 'husk_s_b', h: 34 },
  { src: 'p2_hound_s_b', out: 'hound_s_b', h: 22 },
  { src: 'p2_hound_s', out: 'hound_s', h: 22 },
  { src: 'p2_watchman_s', out: 'watchman_s', h: 34 },
  { src: 'p2_husk_s', out: 'husk_s', h: 34 },
  { src: 'p2_chorister_s', out: 'chorister_s', h: 28 },
  { src: 'p2_priest_s', out: 'priest_s', h: 35 },
  // painterly bosses + NPCs
  { src: 'p2_brute_s', out: 'brute_s', h: 54 },
  { src: 'p2_grist_s', out: 'grist_s', h: 52 },
  { src: 'p2_mother_s', out: 'mother_s', h: 74 },
  { src: 'p2_mother2_s', out: 'mother2_s', h: 74 },
  { src: 'p2_cassar_s', out: 'cassar_s', h: 35 },
  { src: 'p2_maud_s', out: 'maud_s', h: 26 },
  { src: 'p2_verne_s', out: 'verne_s', h: 38 },
  { src: 'p2_sissel_s', out: 'sissel_s', h: 23 },
  { src: 'p2_broker_s', out: 'broker_s', h: 31 },
  { src: 'p2_dunhill_s', out: 'dunhill_s', h: 33 },
];

await mkdir('public/sprites', { recursive: true });
for (const j of JOBS) {
  const srcPath = `assets/sprites/${j.src}.png`;
  if (!existsSync(srcPath)) {
    console.log('skip (missing):', j.src);
    continue;
  }
  const out = `public/sprites/${j.out}.png`;
  await sharp(srcPath).trim().resize({ height: j.h, kernel: 'lanczos3' }).png().toFile(out);
  const meta = await sharp(out).metadata();
  console.log(`${j.src} → ${j.out} ${meta.width}x${meta.height}`);
}
