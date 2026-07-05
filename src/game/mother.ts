// MOTHER OF FACETS — final boss of The Undervein. The first miners, grown into
// one crystal amalgam. Phase 1: slow drift, crystal lances (aimed volley), spike
// rings (radial), and a reaching claw — the claw is her ONLY parryable attack.
// At half health the seam cracks: the dreaming eye of the Marrowed King opens
// behind her, everything hastens, and the rings grow teeth.

import { MOTHER } from './constants';
import { type Entity, moveGrounded, sameTier } from './entity';
import type { Level } from './level';
import type { Player } from './player';
import { angleTo, norm } from '../engine/math';

export type MotherState =
  | 'dormant' | 'chase'
  | 'claw-windup' | 'claw' | 'claw-recover'
  | 'ring-windup' | 'ring-recover'
  | 'lance-windup' | 'lance-recover'
  | 'stagger' | 'dead';

export class Mother implements Entity {
  pos = { x: 0, y: 0, z: 0 };
  vel = { x: 0, y: 0, z: 0 };
  radius = MOTHER.radius;
  airborne = false;
  freezeT = 0;
  flashT = 0;

  readonly isBoss = true;
  readonly name = 'MOTHER OF FACETS';
  hp = MOTHER.hp;
  maxHp = MOTHER.hp;
  state: MotherState = 'dormant';
  stateT = 0;
  attackDir = 0;
  attackHit = false;
  phase2 = false;
  defeated = false;
  active = false;
  spawn = { x: 0, y: 0 };
  // set when an attack resolves; consumed by the game to spawn projectiles
  pendingVolley: { kind: 'ring' | 'lance'; dir: number } | null = null;

  constructor(x: number, y: number, lvl: Level) {
    this.pos = { x, y, z: lvl.groundZAt(x, y) };
    this.spawn = { x, y };
  }

  get alive() { return this.state !== 'dead'; }

  get parryable(): boolean {
    return this.state === 'claw-windup' && this.stateT > MOTHER.claw.windup * 0.35;
  }

  get telegraphFlash(): boolean {
    return this.state === 'claw-windup' && MOTHER.claw.windup * this.haste - this.stateT < 0.12;
  }

  get haste() {
    return this.phase2 ? MOTHER.phase2Haste : 1;
  }

  reset(lvl: Level) {
    if (this.defeated) return;
    this.pos = { x: this.spawn.x, y: this.spawn.y, z: lvl.groundZAt(this.spawn.x, this.spawn.y) };
    this.hp = this.maxHp;
    this.state = 'dormant';
    this.stateT = 0;
    this.phase2 = false;
    this.active = false;
  }

  update(dt: number, lvl: Level, player: Player, events: string[]) {
    if (this.freezeT > 0) { this.freezeT -= dt; return; }
    this.flashT = Math.max(0, this.flashT - dt);
    if (this.state === 'dead') return;
    this.stateT += dt;

    if (!this.phase2 && this.active && this.hp <= this.maxHp * MOTHER.phase2At) {
      this.phase2 = true;
      events.push('mother_phase2');
    }

    const dx = player.pos.x - this.pos.x;
    const dy = player.pos.y - this.pos.y;
    const d = Math.hypot(dx, dy);

    switch (this.state) {
      case 'dormant':
        if (!player.dead && sameTier(this, player) && d < MOTHER.triggerRange) {
          this.active = true;
          events.push('boss_start_mother');
          this.setState('chase');
        }
        break;

      case 'chase': {
        if (player.dead) break;
        if (this.stateT > 0.4) {
          if (d <= MOTHER.claw.range + 8) { this.setState('claw-windup'); break; }
          const roll = Math.random();
          if (roll < (this.phase2 ? 0.45 : 0.3)) { this.setState('ring-windup'); break; }
          if (roll < 0.75) { this.setState('lance-windup'); break; }
        }
        const dir = norm(dx, dy);
        moveGrounded(this, lvl, dir.x * MOTHER.speed * dt, dir.y * MOTHER.speed * dt);
        break;
      }

      case 'claw-windup':
        if (this.stateT >= MOTHER.claw.windup * this.haste) {
          this.attackDir = angleTo(this.pos, player.pos);
          this.attackHit = false;
          this.setState('claw');
        }
        break;
      case 'claw':
        if (this.stateT >= 0.16) this.setState('claw-recover');
        break;
      case 'claw-recover':
        if (this.stateT >= MOTHER.claw.recover * this.haste) this.setState('chase');
        break;

      case 'ring-windup':
        if (this.stateT >= MOTHER.ring.windup * this.haste) {
          this.pendingVolley = { kind: 'ring', dir: 0 };
          this.setState('ring-recover');
        }
        break;
      case 'ring-recover':
        if (this.stateT >= MOTHER.ring.recover * this.haste) this.setState('chase');
        break;

      case 'lance-windup':
        if (this.stateT >= MOTHER.lance.windup * this.haste) {
          this.pendingVolley = { kind: 'lance', dir: angleTo(this.pos, player.pos) };
          this.setState('lance-recover');
        }
        break;
      case 'lance-recover':
        if (this.stateT >= MOTHER.lance.recover * this.haste) this.setState('chase');
        break;

      case 'stagger':
        if (this.stateT >= MOTHER.staggerTime) this.setState('chase');
        break;
    }
  }

  setState(s: MotherState) {
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
