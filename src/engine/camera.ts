import { clamp, damp, lerp, type Vec2 } from './math';
import { VIEW_W, VIEW_H, JUICE } from '../game/constants';

export class Camera {
  x = 0;
  y = 0;
  private shakeAmp = 0;
  offX = 0;
  offY = 0;

  // follow player, leaning toward the aim point (camera lerp toward aim — Vlambeer)
  follow(target: Vec2, aimWorld: Vec2, dt: number, worldW: number, worldH: number) {
    const leanX = clamp((aimWorld.x - target.x) * 0.22, -44, 44);
    const leanY = clamp((aimWorld.y - target.y) * 0.22, -34, 34);
    const dx = target.x + leanX - VIEW_W / 2;
    const dy = target.y + leanY - VIEW_H / 2;
    const k = damp(8, dt);
    this.x = lerp(this.x, clamp(dx, -8, worldW - VIEW_W + 8), k);
    this.y = lerp(this.y, clamp(dy, -8, worldH - VIEW_H + 8), k);

    this.shakeAmp *= Math.pow(JUICE.shakeDecay, dt * 60);
    if (this.shakeAmp < 0.1) this.shakeAmp = 0;
    this.offX = (Math.random() * 2 - 1) * this.shakeAmp;
    this.offY = (Math.random() * 2 - 1) * this.shakeAmp;
  }

  shake(amp: number) {
    this.shakeAmp = Math.min(12, Math.max(this.shakeAmp, amp));
  }

  toScreen(wx: number, wy: number): Vec2 {
    return { x: wx - this.x + this.offX, y: wy - this.y + this.offY };
  }

  toWorld(sx: number, sy: number): Vec2 {
    return { x: sx + this.x, y: sy + this.y };
  }
}
