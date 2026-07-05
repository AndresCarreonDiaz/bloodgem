// ElevenLabs helpers — API contract confirmed against docs (see docs/research/elevenlabs-audio.md).
// SFX: POST /v1/sound-generation, output_format is a QUERY param, loop:true = gapless.
// Music: POST /v1/music, model_id music_v2, prompt XOR composition_plan.
// Never reference Bloodborne/FromSoftware in prompts — API rejects copyrighted refs (bad_prompt).

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const BASE = 'https://api.elevenlabs.io';

async function saveAudio(res, filePath) {
  if (!res.ok) throw new Error(`ElevenLabs failed: ${res.status} ${await res.text()}`);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.from(await res.arrayBuffer()));
  return filePath;
}

export async function generateSfx({
  apiKey,
  text,
  durationSeconds,      // 0.5–30; omit = model auto-picks (flat fee); explicit = 40 credits/sec
  promptInfluence = 0.3, // 0.7–0.9 for precise one-shots, 0.3 for ambience variation
  loop = false,          // true = seamless loop (ambience beds)
  outputFormat = 'mp3_44100_128',
  outPath,
}) {
  const body = { text, model_id: 'eleven_text_to_sound_v2', prompt_influence: promptInfluence, loop };
  if (durationSeconds != null) body.duration_seconds = durationSeconds;
  const res = await fetch(`${BASE}/v1/sound-generation?output_format=${outputFormat}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return saveAudio(res, outPath);
}

export async function generateMusic({
  apiKey,
  prompt,               // XOR compositionPlan
  compositionPlan,      // {chunks: [{text, duration_ms, positive_styles, negative_styles}]}
  lengthMs,             // 3000–600000, prompt mode only
  forceInstrumental = true,
  outputFormat = 'mp3_48000_192',
  outPath,
}) {
  const body = { model_id: 'music_v2' };
  if (compositionPlan) {
    body.composition_plan = compositionPlan;
  } else {
    body.prompt = prompt;
    body.force_instrumental = forceInstrumental;
    if (lengthMs) body.music_length_ms = lengthMs;
  }
  const res = await fetch(`${BASE}/v1/music?output_format=${outputFormat}`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return saveAudio(res, outPath);
}

// Draft a composition plan for free (zero credits) — iterate boss-theme structure
// here, then render the final plan with generateMusic({compositionPlan}).
export async function draftMusicPlan({ apiKey, prompt, lengthMs }) {
  const body = { prompt, model_id: 'music_v2' };
  if (lengthMs) body.music_length_ms = lengthMs;
  const res = await fetch(`${BASE}/v1/music/plan`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ElevenLabs plan failed: ${res.status} ${await res.text()}`);
  return res.json();
}
