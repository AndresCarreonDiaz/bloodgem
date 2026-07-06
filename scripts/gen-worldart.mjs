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
  ember: `Using the reference image as an EXACT spatial layout map, paint a gorgeous AAA-quality dark-fantasy game environment in the style of Diablo IV and No Rest for the Wicked: hand-painted, highly detailed, dramatic — NOT pixel art. Camera: top-down 3/4 perspective (like Diablo) so vertical surfaces are visible: buildings show slate rooftops AND their lower south-facing facades with lit windows, doors and timberwork inside their footprint; terrace and rampart edges show stone wall faces with height; stairways show individual risers. LAYOUT LEGEND — follow it precisely, do not move regions: medium-grey = wet cobblestone Victorian streets and plazas with puddle reflections; light-grey = elevated stone terraces/ramparts; dark teal = a canal of dark still water with stone embankments reflecting lamplight; dark brown blocks = gothic Victorian row-house masses; yellow strips = stone stairways; gold dots = lit gas lamps casting warm pools of light. Bloodborne mood: gaslit night, deep charcoal-blue palette, warm amber lamplight, faint red gem-glow accents, fog in the low places. Rich painterly texture everywhere. CRITICAL: every single region must be FULLY painted with finished detail — absolutely no flat unpainted rectangles, no blank color blocks, no picture-frame borders; the dark border of the layout is thick city-wall masonry with battlements, painted in full. Each dark-brown block must be a COMPLETE building: slate rooftop filling the upper two-thirds of its footprint, facade with lit windows along its lower edge. NO characters, NO creatures, NO text, NO UI. Fill edge to edge, match the layout regions exactly.`,
  undervein: `Using the reference image as an EXACT spatial layout map, paint a gorgeous AAA-quality dark-fantasy game environment in the style of Diablo IV caverns: hand-painted, highly detailed, dramatic — NOT pixel art. Camera: top-down 3/4 perspective so vertical surfaces are visible: rock masses show rough carved faces with height, scaffold walkways show plank edges and support timbers, the minehead shows machinery in volume. LAYOUT LEGEND — follow with ABSOLUTE precision, this is a collision map: dark teal = flooded gallery floor, shallow black water over dark rock with red crystal glints — every teal area is OPEN walkable floor, never rock; medium-grey = wooden plank gantry walkways on timber supports — REPRODUCE THEIR EXACT RECTANGULAR SHAPES AND POSITIONS, perfectly horizontal and vertical strips, do not curve, bend or move them; light-grey = the industrial minehead platform, packed earth, winch machinery, cargo crates; dark brown = solid rock with rough faces, ONLY where brown appears; the large teal region in the TOP-RIGHT is an open excavated ritual chamber with a faint red glow at its heart — open floor, NOT rock; yellow strips = wooden stairs with risers; gold dots = hanging work lanterns. Deep underground, lit by warm lanterns and ominous red crystal veins. Bloodborne dread. Rich painterly texture. NO characters, NO creatures, NO text. Fill edge to edge, match the layout exactly.`,
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
