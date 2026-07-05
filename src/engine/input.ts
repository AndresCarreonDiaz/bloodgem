// Keyboard + mouse with a timestamped press buffer, so parry/dash inputs made a few
// frames early still register (~130ms window) and each press is consumed exactly once.

import type { Vec2 } from './math';

export type Action = 'dash' | 'attack' | 'shard' | 'interact' | 'heal' | 'transform' | 'swap';

export class Input {
  private keys = new Set<string>();
  private pressTimes = new Map<Action, number>();
  mouse: Vec2 = { x: 0, y: 0 };
  private now = 0;

  constructor(canvas: HTMLCanvasElement, viewW: number, viewH: number) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code === 'ShiftLeft') this.press('dash');
      if (e.code === 'KeyE') this.press('interact');
      if (e.code === 'KeyF' || e.code === 'KeyR') this.press('heal');
      if (e.code === 'KeyQ') this.press('transform');
      if (e.code === 'KeyX' || e.code === 'Tab') { this.press('swap'); e.preventDefault(); }
      if (e.code === 'Space') e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * viewW;
      this.mouse.y = ((e.clientY - r.top) / r.height) * viewH;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.press('attack');
      if (e.button === 2) this.press('shard');
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  tick(now: number) {
    this.now = now;
  }

  private press(a: Action) {
    this.pressTimes.set(a, performance.now() / 1000);
  }

  // returns true once per press if it happened within the buffer window
  consume(a: Action, window: number): boolean {
    const t = this.pressTimes.get(a);
    if (t !== undefined && this.now - t <= window) {
      this.pressTimes.delete(a);
      return true;
    }
    return false;
  }

  down(code: string) {
    return this.keys.has(code);
  }

  moveAxis(): Vec2 {
    let x = 0, y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    return { x, y };
  }
}
