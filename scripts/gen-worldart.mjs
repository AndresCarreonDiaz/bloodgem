// The big visual pivot: paint each level as ONE coherent artwork, conditioned
// on the exact collision layout so beauty and gameplay stay aligned.
// 1) rasterize the tier map to a color-coded layout PNG (sharp+SVG)
// 2) nano-banana-2 paints over it (image_input conditioning)
// 3) resize to exact world pixel size → public/maps/<level>.png
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { runNanoBanana2, downloadTo } from './lib/replicate.mjs';
import { loadEnv } from './lib/env.mjs';
import { buildEmberRow, buildUndervein } from '/tmp/level-bundle.mjs';

const { REPLICATE_API_TOKEN: KEY } = loadEnv();
const which = process.argv[2] ?? 'ember';
const lvl = which === 'ember' ? buildEmberRow() : buildUndervein();
const S = 8; // svg px per tile

const COLORS = { 0: '#12414a', 1: '#5a5a66', 2: '#9a9aa8', 9: '#3d2b22' }; // canal/street/terrace/buildings
let rects = '';
for (let y = 0; y < lvl.h; y++)
  for (let x = 0; x < lvl.w; x++) {
    const t = lvl.tierAt(x, y);
    rects += `<rect x="${x * S}" y="${y * S}" width="${S}" height="${S}" fill="${COLORS[t] ?? '#3d2b22'}"/>`;
  }
for (const r of lvl.ramps) rects += `<rect x="${r.x0 * S}" y="${r.y0 * S}" width="${(r.x1 - r.x0 + 1) * S}" height="${(r.y1 - r.y0 + 1) * S}" fill="#c8b060"/>`;
for (const l of lvl.lamps) rects += `<circle cx="${l.x / 16 * S}" cy="${l.y / 16 * S}" r="${S}" fill="#ffd257"/>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${lvl.w * S}" height="${lvl.h * S}">${rects}</svg>`;
await mkdir('assets/maps', { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(`assets/maps/${which}-layout.png`);
console.log('layout ok', lvl.w * S, 'x', lvl.h * S);

const PROMPTS = {
  ember: `Using the reference image as an EXACT spatial layout map, paint a gorgeous, highly detailed dark-fantasy pixel art city district seen from directly above (top-down game map). LAYOUT LEGEND — follow it precisely, do not move regions: medium-grey areas = cobblestone Victorian streets and plazas; light-grey areas = elevated stone terraces and ramparts with visible edge walls where they meet streets; dark teal areas = a canal of dark still water with stone embankments; dark brown blocks = dense Victorian rooftops of gothic row-houses (slate shingles, chimneys, dormers, ridgelines) seen from above; yellow strips = broad stone stairways; gold dots = lit gas lamps casting warm pools of light. Night scene, gaslit, moody: deep charcoal-blue palette with warm amber lamplight and occasional faint red gem-glow accents. Rich texture everywhere — weathered cobbles, roof detail, market clutter, moss and grime — in crisp detailed 16-bit pixel art. NO characters, NO creatures, NO text, NO UI. The image must fill edge to edge and match the reference layout exactly.`,
  undervein: `Using the reference image as an EXACT spatial layout map, paint a gorgeous, highly detailed dark-fantasy pixel art mine cavern seen from directly above (top-down game map). LAYOUT LEGEND — follow precisely: dark teal areas = flooded gallery floor of dark rock and shallow black water with faint red crystal glints; medium-grey areas = wooden scaffold walkways and plank gantries on timber supports; light-grey areas = the industrial minehead platform of packed earth, winch machinery and cargo crates; dark brown blocks = solid unexcavated rock mass with rough carved faces; yellow strips = wooden stairs; gold dots = hanging work lanterns. Deep underground night scene lit by warm lanterns and ominous red crystal veins growing from the rock. Rich texture: rock strata, timber grain, mining debris, ore glints — crisp detailed 16-bit pixel art. NO characters, NO creatures, NO text. Fill edge to edge, match the reference layout exactly.`,
};

const url = await runNanoBanana2({
  apiKey: KEY,
  prompt: PROMPTS[which],
  imageInput: [`data:image/png;base64,${(await sharp(`assets/maps/${which}-layout.png`).png().toBuffer()).toString('base64')}`],
  aspectRatio: which === 'ember' ? '4:3' : '4:3',
  resolution: '2K',
  outputFormat: 'png',
});
await downloadTo(url, `assets/maps/${which}-art-raw.png`);
await mkdir('public/maps', { recursive: true });
await sharp(`assets/maps/${which}-art-raw.png`)
  .resize(lvl.w * 16, lvl.h * 16, { fit: 'fill', kernel: 'lanczos3' })
  .png()
  .toFile(`public/maps/${which}.png`);
console.log('painted map ok →', `public/maps/${which}.png`);
