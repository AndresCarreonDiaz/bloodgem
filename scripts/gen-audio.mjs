// Batch-generate the game's audio via ElevenLabs into assets/audio/.
// Skips files that already exist so reruns only fill gaps.
// Usage: node scripts/gen-audio.mjs [--only name1,name2]

import { existsSync } from 'node:fs';
import { generateSfx, generateMusic } from './lib/elevenlabs.mjs';
import { loadEnv } from './lib/env.mjs';

const { ELEVENLABS_API_KEY: KEY } = loadEnv();
const OUT = 'assets/audio';

const SFX = [
  { name: 'hit_light',  dur: 0.5, text: 'Quick blade slash into flesh, wet impact, one-shot' },
  { name: 'hit_heavy',  dur: 0.7, text: 'Heavy wet flesh impact with bone crunch, visceral, one-shot' },
  { name: 'parry',      dur: 0.9, text: 'Sharp flintlock gunshot crack with ringing crystalline tail, one-shot' },
  { name: 'stagger',    dur: 0.8, text: 'Crystal shattering crack, glass fracture with dark shimmer, one-shot' },
  { name: 'visceral',   dur: 1.3, text: 'Brutal wet stab and tear, gory squelch with bone crack, one-shot' },
  { name: 'dash',       dur: 0.5, text: 'Fast cloth whoosh dodge, sharp air swish, one-shot' },
  { name: 'shard',      dur: 0.5, text: 'Small pistol shot with a crystalline zing ricochet, one-shot' },
  { name: 'hurt',       dur: 0.5, text: 'Male hunter grunt of pain, sharp winded exhale, one-shot' },
  { name: 'enemy_die',  dur: 0.9, text: 'Monster death gurgle and wet collapse thud, one-shot' },
  { name: 'pickup',     dur: 0.5, text: 'Delicate crystal chime shimmer, small treasure pickup, one-shot' },
  { name: 'lamp',       dur: 1.4, text: 'Warm ethereal bell chime with soft angelic shimmer, safe and beautiful sanctuary tone, one-shot' },
  { name: 'death_bell', dur: 1.8, text: 'Deep tolling funeral church bell, single strike, dark cathedral reverb tail, one-shot' },
];

const AMBIENCE = [
  { name: 'amb_ember_row', dur: 24, text: 'Low howling wind through gothic stone streets at night, distant tolling church bell, creaking wood signs, sparse distant crows, oppressive horror ambience, loop' },
];

const MUSIC = [
  { name: 'music_title', lengthMs: 70000, prompt: 'Dark gothic orchestral, slow mournful dissonant strings, deep male choir chanting low, church organ swells, tolling bell accents, sparse tragic and oppressive, 60 BPM in D minor, completely instrumental' },
];

const only = process.argv.includes('--only')
  ? process.argv[process.argv.indexOf('--only') + 1].split(',')
  : null;

// ElevenLabs allows max 4 concurrent requests on this tier — run in chunks of 3
const jobs = [];
for (const s of SFX) {
  const path = `${OUT}/${s.name}.mp3`;
  if (existsSync(path) || (only && !only.includes(s.name))) continue;
  jobs.push(() =>
    generateSfx({ apiKey: KEY, text: s.text, durationSeconds: s.dur, promptInfluence: 0.75, outPath: path })
      .then(() => console.log('sfx ok:', s.name))
      .catch((e) => console.error('sfx FAIL:', s.name, e.message)),
  );
}
for (const a of AMBIENCE) {
  const path = `${OUT}/${a.name}.mp3`;
  if (existsSync(path) || (only && !only.includes(a.name))) continue;
  jobs.push(() =>
    generateSfx({ apiKey: KEY, text: a.text, durationSeconds: a.dur, promptInfluence: 0.4, loop: true, outPath: path })
      .then(() => console.log('ambience ok:', a.name))
      .catch((e) => console.error('ambience FAIL:', a.name, e.message)),
  );
}
for (let i = 0; i < jobs.length; i += 3) {
  await Promise.all(jobs.slice(i, i + 3).map((j) => j()));
}

for (const m of MUSIC) {
  const path = `${OUT}/${m.name}.mp3`;
  if (existsSync(path) || (only && !only.includes(m.name))) continue;
  try {
    await generateMusic({ apiKey: KEY, prompt: m.prompt, lengthMs: m.lengthMs, outPath: path });
    console.log('music ok:', m.name);
  } catch (e) {
    console.error('music FAIL:', m.name, e.message);
  }
}
console.log('audio batch done');
