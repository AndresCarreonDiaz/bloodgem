import { GRAVITY } from '../game/constants';

export interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; maxLife: number;
  size: number; color: string;
  gravity: boolean;
}

export class Particles {
  list: Particle[] = [];

  burst(x: number, y: number, z: number, count: number, color: string, speed = 80, gravity = true) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.list.push({
        x, y, z: z + 6 + Math.random() * 6,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6, vz: 40 + Math.random() * 90,
        life: 0, maxLife: 0.35 + Math.random() * 0.4,
        size: 1 + Math.random() * 2, color, gravity,
      });
    }
  }

  update(dt: number) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life += dt;
      if (p.life >= p.maxLife) { this.list.splice(i, 1); continue; }
      if (p.gravity) p.vz -= GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z = Math.max(0, p.z + p.vz * dt);
      p.vx *= 0.94;
      p.vy *= 0.94;
    }
  }
}
