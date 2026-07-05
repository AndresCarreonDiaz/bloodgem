// CASSAR, THE RIVAL — optional duel on the east rampart, once the Brute falls.
// He fights with the player's own kit: quicksteps with i-frames, reactive
// dodges when you wind up, shard shots at range — and the COUNTER-STANCE:
// pistol raised, glinting. Strike him then and the riposte staggers YOU.
// The parry final exam: bait the stance, shoot it, or wait it out.

import { type Entity, moveGrounded, sameTier } from './entity';
import type { Level } from './level';
import type { Player } from './player';
import { angleTo, norm } from '../engine/math';

export const CASSAR = {
  hp: 260,
  radius: 5,
  speed: 96,
  triggerRange: 110,
  combo: { windup: 0.32, active: 0.12, gap: 0.24, range: 26, arc: 1.9, dmg: 16, recover: 0.55 },
  dash: { duration: 0.26, speed: 250, iframes: 0.16 },
  shot: { windup: 0.5, speed: 380, dmg: 12, minRange: 70 },
  counter: { duration: 1.6, riposteDmg: 20, staggerPlayer: 0.9 },
  staggerTime: 2.0,
  gemdust: 600,
};

export type CassarState =
  | 'dormant' | 'duel-bow' | 'strafe'
  | 'combo1' | 'combo1-active' | 'combo2' | 'combo2-active' | 'combo-recover'
  | 'quickstep' | 'shot-windup' | 'shot-recover'
  | 'counter' | 'riposte'
  | 'stagger' | 'dead';

export class Cassar implements Entity {
  pos = { x: 0, y: 0, z: 0 };
  vel = { x: 0, y: 0, z: 0 };
  radius = CASSAR.radius;
  airborne = false;
  freezeT = 0;
  flashT = 0;

  readonly isBoss = true;
  hp = CASSAR.hp;
  maxHp = CASSAR.hp;
  state: CassarState = 'dormant';
  stateT = 0;
  attackDir = 0;
  attackHit = false;
  dashDir = { x: 0, y: 1 };
  strafeSign = 1;
  defeated = false;
  active = false;
  spawn = { x: 0, y: 0 };
  pendingShot = false;

  constructor(x: number, y: number, lvl: Level) {
    this.pos = { x, y, z: lvl.groundZAt(x, y) };
    this.spawn = { x, y };
  }

  get alive() { return this.state !== 'dead'; }

  // his second combo swing is the parry window — like fighting a mirror
  get parryable(): boolean {
    return this.state === 'combo2' && this.stateT > 0.08;
  }

  get telegraphFlash(): boolean {
    return this.state === 'combo2' && CASSAR.combo.windup * 0.8 - this.stateT < 0.1;
  }

  get invulnerable(): boolean {
    return this.state === 'quickstep' && this.stateT < CASSAR.dash.iframes;
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
        if (!player.dead && sameTier(this, player) && d < CASSAR.triggerRange) {
          this.active = true;
          events.push('boss_start');
          this.setState('duel-bow');
        }
        break;

      case 'duel-bow': // a moment of courtesy before the knives
        if (this.stateT >= 1.1) this.setState('strafe');
        break;

      case 'strafe': {
        if (player.dead) break;
        // reactive quickstep when the player winds up close
        if (player.attack && d < 44 && Math.random() < 0.05) {
          this.beginQuickstep(dx, dy);
          break;
        }
        if (this.stateT > 0.5) {
          const roll = Math.random();
          if (d <= CASSAR.combo.range + 6) {
            if (roll < 0.2) { this.setState('counter'); break; }
            this.attackDir = angleTo(this.pos, player.pos);
            this.setState('combo1');
            break;
          }
          if (d > CASSAR.shot.minRange && roll < 0.3) {
            this.attackDir = angleTo(this.pos, player.pos);
            this.setState('shot-windup');
            break;
          }
          if (roll < 0.45) { this.beginQuickstep(dx, dy); break; }
        }
        // circle the player like a duelist
        if (Math.random() < 0.01) this.strafeSign *= -1;
        const toPlayer = norm(dx, dy);
        const tangent = { x: -toPlayer.y * this.strafeSign, y: toPlayer.x * this.strafeSign };
        const approach = d > 34 ? 0.8 : d < 24 ? -0.5 : 0;
        moveGrounded(
          this, lvl,
          (toPlayer.x * approach + tangent.x * 0.6) * CASSAR.speed * dt,
          (toPlayer.y * approach + tangent.y * 0.6) * CASSAR.speed * dt,
        );
        break;
      }

      case 'combo1':
        if (this.stateT >= CASSAR.combo.windup) { this.attackHit = false; this.setState('combo1-active'); }
        break;
      case 'combo1-active':
        if (this.stateT >= CASSAR.combo.active) {
          this.attackDir = angleTo(this.pos, player.pos); // second swing re-tracks
          this.setState('combo2');
        }
        break;
      case 'combo2':
        if (this.stateT >= CASSAR.combo.windup * 0.8) { this.attackHit = false; this.setState('combo2-active'); }
        break;
      case 'combo2-active':
        if (this.stateT >= CASSAR.combo.active) this.setState('combo-recover');
        break;
      case 'combo-recover':
        if (this.stateT >= CASSAR.combo.recover) this.setState('strafe');
        break;

      case 'quickstep':
        moveGrounded(this, lvl, this.dashDir.x * CASSAR.dash.speed * dt, this.dashDir.y * CASSAR.dash.speed * dt);
        if (this.stateT >= CASSAR.dash.duration) this.setState('strafe');
        break;

      case 'shot-windup':
        if (this.stateT >= CASSAR.shot.windup) {
          this.pendingShot = true;
          this.setState('shot-recover');
        }
        break;
      case 'shot-recover':
        if (this.stateT >= 0.5) this.setState('strafe');
        break;

      case 'counter': // pistol raised — strike him now and regret it
        if (this.stateT >= CASSAR.counter.duration) this.setState('strafe');
        break;
      case 'riposte':
        if (this.stateT >= 0.5) this.setState('strafe');
        break;

      case 'stagger':
        if (this.stateT >= CASSAR.staggerTime) this.setState('strafe');
        break;
    }
  }

  private beginQuickstep(dx: number, dy: number) {
    const toPlayer = norm(dx, dy);
    const sign = Math.random() < 0.5 ? 1 : -1;
    this.dashDir = { x: -toPlayer.y * sign - toPlayer.x * 0.4, y: toPlayer.x * sign - toPlayer.y * 0.4 };
    const n = norm(this.dashDir.x, this.dashDir.y);
    this.dashDir = n;
    this.setState('quickstep');
  }

  setState(s: CassarState) {
    this.state = s;
    this.stateT = 0;
  }

  takeDamage(dmg: number, fromDir: number, knockForce = 40) {
    if (this.state === 'dead' || this.invulnerable) return;
    this.hp -= dmg;
    this.flashT = 2 / 60;
    this.pos.x += Math.cos(fromDir) * knockForce * 0.05;
    this.pos.y += Math.sin(fromDir) * knockForce * 0.05;
    if (this.hp <= 0) {
      this.state = 'dead';
      this.defeated = true;
    }
  }
}
