// FOREMAN GRIST, HOLLOWED — mid-boss of the Gantry. Fights on the narrow
// scaffold ring: his cart-on-a-chain sweep covers almost a full circle (dash
// through it or drop off the planks), the overhead cart slam is parryable,
// and from range he throws the hook — get caught and he reels you in.

import { GRIST } from './constants';
import { type Entity, moveGrounded, sameTier } from './entity';
import type { Level } from './level';
import type { Player } from './player';
import { angleTo, norm } from '../engine/math';

export type GristState =
  | 'dormant' | 'chase'
  | 'sweep-windup' | 'sweep' | 'sweep-recover'
  | 'slam-windup' | 'slam-recover'
  | 'hook-windup' | 'hook-recover'
  | 'stagger' | 'dead';

export class Grist implements Entity {
  pos = { x: 0, y: 0, z: 0 };
  vel = { x: 0, y: 0, z: 0 };
  radius = GRIST.radius;
  airborne = false;
  freezeT = 0;
  flashT = 0;

  readonly isBoss = true;
  hp = GRIST.hp;
  maxHp = GRIST.hp;
  state: GristState = 'dormant';
  stateT = 0;
  attackDir = 0;
  attackHit = false;
  defeated = false;
  active = false;
  spawn = { x: 0, y: 0 };
  pendingHook: { dir: number } | null = null;

  constructor(x: number, y: number, lvl: Level) {
    this.pos = { x, y, z: lvl.groundZAt(x, y) };
    this.spawn = { x, y };
  }

  get alive() { return this.state !== 'dead'; }

  get parryable(): boolean {
    return this.state === 'slam-windup' && this.stateT > GRIST.slam.windup * 0.35;
  }

  get telegraphFlash(): boolean {
    return this.state === 'slam-windup' && GRIST.slam.windup - this.stateT < 0.12;
  }

  reset(lvl: Level) {
    if (this.defeated) return;
    this.pos = { x: this.spawn.x, y: this.spawn.y, z: lvl.groundZAt(this.spawn.x, this.spawn.y) };
    this.hp = this.maxHp;
    this.state = 'dormant';
    this.stateT = 0;
    this.active = false;
  }

  update(dt: number, lvl: Level, player: Player, events: string[]) {
    if (this.freezeT > 0) { this.freezeT -= dt; return; }
    this.flashT = Math.max(0, this.flashT - dt);
    if (this.state === 'dead') return;
    this.stateT += dt;

    const dx = player.pos.x - this.pos.x;
    const dy = player.pos.y - this.pos.y;
    const d = Math.hypot(dx, dy);

    switch (this.state) {
      case 'dormant':
        if (!player.dead && sameTier(this, player) && d < GRIST.triggerRange) {
          this.active = true;
          events.push('boss_start');
          this.setState('chase');
        }
        break;

      case 'chase': {
        if (player.dead) break;
        if (this.stateT > 0.4) {
          if (d > GRIST.hook.minRange && Math.random() < 0.5) {
            this.attackDir = angleTo(this.pos, player.pos);
            this.setState('hook-windup');
            break;
          }
          if (d <= 46) {
            this.setState(Math.random() < 0.55 ? 'sweep-windup' : 'slam-windup');
            break;
          }
        }
        const dir = norm(dx, dy);
        moveGrounded(this, lvl, dir.x * GRIST.speed * dt, dir.y * GRIST.speed * dt);
        break;
      }

      case 'sweep-windup':
        if (this.stateT >= GRIST.sweep.windup) {
          this.attackDir = angleTo(this.pos, player.pos);
          this.attackHit = false;
          this.setState('sweep');
          events.push('chain');
        }
        break;
      case 'sweep':
        if (this.stateT >= GRIST.sweep.active) this.setState('sweep-recover');
        break;
      case 'sweep-recover':
        if (this.stateT >= GRIST.sweep.recover) this.setState('chase');
        break;

      case 'slam-windup':
        if (this.stateT >= GRIST.slam.windup) {
          this.attackDir = angleTo(this.pos, player.pos);
          this.attackHit = false;
          this.setState('slam-recover');
          events.push('slam');
        }
        break;
      case 'slam-recover':
        if (this.stateT >= GRIST.slam.recover) this.setState('chase');
        break;

      case 'hook-windup':
        if (this.stateT >= GRIST.hook.windup) {
          this.pendingHook = { dir: angleTo(this.pos, player.pos) };
          this.setState('hook-recover');
          events.push('chain');
        }
        break;
      case 'hook-recover':
        if (this.stateT >= GRIST.hook.recover) this.setState('chase');
        break;

      case 'stagger':
        if (this.stateT >= GRIST.staggerTime) this.setState('chase');
        break;
    }
  }

  setState(s: GristState) {
    this.state = s;
    this.stateT = 0;
  }

  takeDamage(dmg: number, _fromDir: number, _knockForce = 0) {
    if (this.state === 'dead') return;
    this.hp -= dmg;
    this.flashT = 2 / 60;
    if (this.hp <= 0) {
      this.state = 'dead';
      this.defeated = true;
    }
  }
}
