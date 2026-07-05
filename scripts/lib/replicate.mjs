// Replicate helper for google/nano-banana-2 — adapted from the fittica-app
// create-prediction + poll pattern, but using the model-scoped endpoint so we
// always get the latest version.

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const MODEL = 'google/nano-banana-2';

export async function runNanoBanana2({
  apiKey,
  prompt,
  imageInput = [],
  aspectRatio = '1:1',
  resolution = '1K',
  outputFormat = 'png',
  timeoutSeconds = 180,
}) {
  const createRes = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      // Blocks up to 60s; 1K generations usually finish inside the window.
      // If not, the prediction returns in 'starting' state and the poll loop below takes over.
      Prefer: 'wait',
    },
    body: JSON.stringify({
      input: {
        prompt,
        image_input: imageInput,
        aspect_ratio: aspectRatio,
        resolution,
        output_format: outputFormat,
      },
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Replicate create failed: ${createRes.status} ${await createRes.text()}`);
  }

  const prediction = await createRes.json();
  let result = prediction;
  let attempts = 0;

  while (!['succeeded', 'failed', 'canceled'].includes(result.status) && attempts < timeoutSeconds) {
    await new Promise((r) => setTimeout(r, 1000));
    const statusRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!statusRes.ok) throw new Error(`Replicate status check failed: ${statusRes.status}`);
    result = await statusRes.json();
    attempts++;
  }

  if (result.status !== 'succeeded') {
    throw new Error(`Prediction ${result.status}: ${result.error ?? 'timed out'}`);
  }

  const output = Array.isArray(result.output) ? result.output[0] : result.output;
  if (!output) throw new Error('No image in prediction output');
  return output;
}

export async function downloadTo(url, filePath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, Buffer.from(await res.arrayBuffer()));
  return filePath;
}
