// Web Audio manager: decode once, play one-shots and loops. All game audio is
// pre-generated at build time (ElevenLabs) — nothing is synthesized at runtime.

export class AudioManager {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loops = new Map<string, { src: AudioBufferSourceNode; gain: GainNode }>();

  // must be called from a user gesture
  ensureContext() {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  async load(names: string[]) {
    this.ensureContext();
    await Promise.all(
      names.map(async (n) => {
        if (this.buffers.has(n)) return;
        try {
          const res = await fetch(`audio/${n}.mp3`);
          const data = await res.arrayBuffer();
          this.buffers.set(n, await this.ctx!.decodeAudioData(data));
        } catch {
          // missing audio must never break the game
        }
      }),
    );
  }

  play(name: string, volume = 0.9) {
    const buf = this.buffers.get(name);
    if (!buf || !this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(this.ctx.destination);
    src.start();
  }

  loop(name: string, volume = 0.35) {
    if (this.loops.has(name)) return;
    const buf = this.buffers.get(name);
    if (!buf || !this.ctx) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(this.ctx.destination);
    src.start();
    this.loops.set(name, { src, gain });
  }

  stopLoop(name: string, fadeSec = 0.5) {
    const l = this.loops.get(name);
    if (!l || !this.ctx) return;
    l.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fadeSec);
    l.src.stop(this.ctx.currentTime + fadeSec);
    this.loops.delete(name);
  }
}
