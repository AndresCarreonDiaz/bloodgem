// World renderer. Pass 1: floor tops per tier ascending (+ decals). Pass 2: a single
// y-sorted list of faces, walls, entities, particles — painter's algorithm keyed on
// where each thing meets the ground. Sprites draw at screenY = worldY − z with the
// shadow blob pinned at ground z (THE height cue). Tofu-man placeholders until the
// combat is fun (Rubinite's process), then sprites swap in.

import { TILE, TIER_H, WALL_TIER, COLORS, RABBLE, HOUND, BRUTE, MOTHER, GRIST, VIEW_W, VIEW_H, PLAYER } from './constants';
import { Brute } from './brute';
import { Mother } from './mother';
import { Grist } from './grist';
import { Cassar, CASSAR } from './cassar';
import { GEMS } from './skills';
import type { Game } from './game';
import type { Level } from './level';
import { Enemy } from './enemy';
import { Player } from './player';
import { sprites, drawSprite } from '../engine/sprites';

type DrawFn = (ctx: CanvasRenderingContext2D) => void;
interface Drawable { key: number; draw: DrawFn }

const WALL_VISUAL_H = TIER_H * 2 + 8;

let lightCanvas: HTMLCanvasElement | null = null;

// Painted-world mode: elevation is baked into the backdrop art, so a standing
// entity draws at its position — only height ABOVE local ground (falls, shots,
// particles) offsets the sprite. Physics/pos.z semantics are unchanged.
let CUR: Game | null = null;
function vz(x: number, y: number, z: number): number {
  if (!CUR) return z;
  return Math.max(0, z - CUR.lvl.groundZAt(x, y));
}
function backdrop(): HTMLImageElement | null {
  return CUR ? sprites.get(`map_${CUR.lvl.name}`) : null;
}

export function render(ctx: CanvasRenderingContext2D, game: Game, time: number) {
  CUR = game;
  const { lvl, camera } = game;
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.save();
  ctx.translate(Math.round(-camera.x + camera.offX), Math.round(-camera.y + camera.offY));

  drawFloors(ctx, game);

  const list: Drawable[] = [];
  collectTerrain(list, game, time);
  collectEntities(list, game, time);
  list.sort((a, b) => a.key - b.key);
  for (const d of list) d.draw(ctx);

  drawGodrays(ctx, game, time);
  drawFloatTexts(ctx, game);
  ctx.restore();

  drawAtmosphere(ctx, game, time);
  drawLighting(ctx, game, time);
  drawGrade(ctx, game);
}

// shafts of pale light through the smoke / the mineshaft openings
const GODRAYS: Record<string, { x: number; y: number; h: number; w: number }[]> = {
  ember: [{ x: 52 * TILE, y: 30 * TILE, h: 210, w: 46 }],
  undervein: [
    { x: 24 * TILE, y: 19 * TILE, h: 240, w: 40 },
    { x: 41 * TILE, y: 31 * TILE, h: 220, w: 34 },
  ],
};

function drawGodrays(ctx: CanvasRenderingContext2D, game: Game, time: number) {
  const rays = GODRAYS[game.lvl.name];
  if (!rays) return;
  ctx.globalCompositeOperation = 'lighter';
  for (const r of rays) {
    const osc = 1 + 0.12 * Math.sin(time / 6 + r.x);
    const w = r.w * osc;
    const slant = 38;
    const g = ctx.createLinearGradient(r.x - slant, r.y - r.h, r.x, r.y);
    const col = game.lvl.name === 'ember' ? '170, 190, 220' : '235, 120, 110';
    g.addColorStop(0, `rgba(${col}, 0.10)`);
    g.addColorStop(1, `rgba(${col}, 0)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(r.x - slant - w / 2, r.y - r.h);
    ctx.lineTo(r.x - slant + w / 2, r.y - r.h);
    ctx.lineTo(r.x + w * 0.8, r.y);
    ctx.lineTo(r.x - w * 0.8, r.y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
}

// per-area color grade + always-on soft vignette — the poor man's LUT
function drawGrade(ctx: CanvasRenderingContext2D, game: Game) {
  const ember = game.lvl.name === 'ember';
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = ember ? 'rgba(58, 66, 104, 0.20)' : 'rgba(96, 62, 52, 0.20)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = ember ? 'rgba(14, 10, 28, 0.5)' : 'rgba(30, 8, 4, 0.4)';
  ctx.globalAlpha = 0.14;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'multiply';
  const v = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85);
  v.addColorStop(0, 'rgba(255,255,255,1)');
  v.addColorStop(1, 'rgba(200,200,210,1)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalCompositeOperation = 'source-over';
}

const TIER_TEX: Record<string, string[]> = {
  ember: ['tex_canal', 'tex_cobble', 'tex_flagstone'],
  undervein: ['tex_minerock', 'tex_planks', 'tex_minehead'],
};

function drawFloors(ctx: CanvasRenderingContext2D, game: Game) {
  const { lvl } = game;
  const pal = lvl.palette;
  const art = backdrop();
  if (art) {
    ctx.drawImage(art, 0, 0, lvl.pixelW, lvl.pixelH);
    // broken secrets reveal alcoves the painting can't know about
    for (const sec of lvl.secrets) {
      if (!sec.broken) continue;
      ctx.fillStyle = '#1a1216';
      ctx.fillRect(sec.tx * TILE, sec.ty * TILE, sec.w * TILE, (sec.h + 1) * TILE);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(sec.tx * TILE, sec.ty * TILE, sec.w * TILE, 2);
    }
    // dynamic + seeded decals still land on top of the painting
    for (const d of game.decals) {
      const dy = d.y - vz(d.x, d.y, d.z);
      const type = (d as { type?: string }).type ?? 'blood';
      if (type === 'blood') {
        ctx.fillStyle = 'rgba(110, 16, 28, 0.55)';
        ctx.beginPath();
        ctx.ellipse(d.x, dy, d.r, d.r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // moss/crack/rubble weathering is painted into the art now — skip
    }
    return;
  }
  const floors = [pal.floor0, pal.floor1, pal.floor2];
  const texNames = TIER_TEX[lvl.name];
  for (let tier = 0; tier <= 2; tier++) {
    const tex = sprites.get(texNames[tier]);
    for (let ty = 0; ty < lvl.h; ty++) {
      for (let tx = 0; tx < lvl.w; tx++) {
        if (lvl.tierAt(tx, ty) !== tier || lvl.rampAtTile(tx, ty)) continue;
        const sy = ty * TILE - tier * TIER_H;
        const ovName = lvl.texFor(tx, ty);
        const cellTex = ovName ? sprites.get(ovName) ?? tex : tex;
        if (cellTex) {
          // 16 texture variants (4×4 grid) hashed by cell — breaks grid repetition
          const v = (tx * 7 + ty * 13 + tier * 5) & 15;
          ctx.drawImage(cellTex, (v & 3) * 16, (v >> 2) * 16, 16, 16, tx * TILE, sy, TILE, TILE);
        } else {
          ctx.fillStyle = floors[tier];
          ctx.fillRect(tx * TILE, sy, TILE, TILE);
        }
        // contact-shadow AO where higher ground rises to the north
        const northZ = lvl.tierAt(tx, ty - 1);
        if (northZ !== WALL_TIER && northZ > tier) {
          const g = ctx.createLinearGradient(0, sy, 0, sy + 7);
          g.addColorStop(0, 'rgba(0,0,0,0.4)');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g;
          ctx.fillRect(tx * TILE, sy, TILE, 7);
        } else if (northZ === WALL_TIER) {
          ctx.fillStyle = 'rgba(0,0,0,0.28)';
          ctx.fillRect(tx * TILE, sy, TILE, 4);
        }
      }
    }
    // decal layer: blood, moss, cracks, rubble — off-grid, breaks repetition
    for (const d of game.decals) {
      if (Math.round(d.z / TIER_H) !== tier) continue;
      const dy = d.y - d.z;
      const type = (d as { type?: string }).type ?? 'blood';
      if (type === 'moss') {
        ctx.fillStyle = 'rgba(92, 108, 74, 0.22)';
        ctx.beginPath();
        ctx.ellipse(d.x, dy, d.r, d.r * 0.7, 0.4, 0, Math.PI * 2);
        ctx.ellipse(d.x + d.r * 0.7, dy + 2, d.r * 0.55, d.r * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (type === 'crack') {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(d.x - d.r, dy - 2);
        ctx.lineTo(d.x - d.r * 0.2, dy + 1);
        ctx.lineTo(d.x + d.r * 0.4, dy - 1);
        ctx.lineTo(d.x + d.r, dy + 3);
        ctx.moveTo(d.x - d.r * 0.2, dy + 1);
        ctx.lineTo(d.x, dy + d.r * 0.7);
        ctx.stroke();
      } else if (type === 'rubble') {
        ctx.fillStyle = 'rgba(70, 58, 52, 0.8)';
        ctx.fillRect(d.x - d.r * 0.6, dy - 1, 3, 2);
        ctx.fillRect(d.x + d.r * 0.2, dy + 2, 2, 2);
        ctx.fillRect(d.x - 1, dy - d.r * 0.5, 2, 2);
        ctx.fillStyle = 'rgba(40, 32, 30, 0.8)';
        ctx.fillRect(d.x + d.r * 0.5, dy - 3, 2, 1.5);
      } else {
        ctx.fillStyle = 'rgba(110, 16, 28, 0.55)';
        ctx.beginPath();
        ctx.ellipse(d.x, dy, d.r, d.r * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // canal water shimmer: slow drifting highlight bands on tier-0 water (ember)
  if (lvl.name === 'ember') {
    const t = performance.now() / 1000;
    ctx.fillStyle = 'rgba(130, 170, 180, 0.05)';
    for (let ty = 0; ty < lvl.h; ty++) {
      for (let tx = 0; tx < lvl.w; tx++) {
        if (lvl.tierAt(tx, ty) !== 0) continue;
        const ph = Math.sin(t * 0.9 + tx * 0.55 + ty * 1.4);
        if (ph > 0.55) {
          const off = ((t * 5 + tx * 3) % TILE);
          ctx.fillRect(tx * TILE + off * 0.4, ty * TILE + 5 + ((tx * 5 + ty * 9) % 7), 8 + ph * 4, 1.5);
        }
      }
    }
  }

  // ramps: stepped strips reading as stairs
  for (const r of game.lvl.ramps) {
    const px0 = r.x0 * TILE, py0 = r.y0 * TILE;
    const w = (r.x1 - r.x0 + 1) * TILE, h = (r.y1 - r.y0 + 1) * TILE;
    const steps = 6;
    const stepDrop = (r.highZ - r.lowZ) / steps;
    for (let i = 0; i < steps; i++) {
      // northmost strip = highest (dir N); each strip extends down over the
      // riser so consecutive steps meet with no gap
      const stripY = py0 + (i * h) / steps;
      const z = r.highZ - ((i + 0.5) / steps) * (r.highZ - r.lowZ);
      const shade = 0.5 + 0.5 * (z / TIER_H / 2);
      ctx.fillStyle = game.lvl.palette.ramp;
      ctx.fillRect(px0, stripY - z, w, h / steps + stepDrop + 1);
      ctx.fillStyle = `rgba(255,255,255,${0.03 + 0.04 * shade})`;
      ctx.fillRect(px0, stripY - z, w, 1.5);
    }
  }
}

function collectTerrain(list: Drawable[], game: Game, time: number) {
  const lvl = game.lvl;
  const pal = lvl.palette;
  // cutaway: a wall/face column that would draw over the player (player is
  // BEHIND it, i.e. just north and horizontally near) goes translucent
  const p = game.player;
  const occludes = (tx: number, footY: number, visualH: number) => {
    if (p.dead) return false;
    const cx = (tx + 0.5) * TILE;
    if (Math.abs(p.pos.x - cx) > 18) return false;
    const spriteTop = p.pos.y - p.pos.z - 30;
    const spriteBot = p.pos.y - p.pos.z + 2;
    const colTop = footY - visualH;
    return p.pos.y < footY && spriteBot > colTop && spriteTop < footY;
  };
  for (let ty = 0; ty < lvl.h; ty++) {
    for (let tx = 0; tx < lvl.w; tx++) {
      const tier = lvl.tierAt(tx, ty);
      const south = lvl.tierAt(tx, ty + 1);
      const footY = (ty + 1) * TILE;
      if (backdrop()) continue; // walls & cliff faces live in the painting
      if (tier === WALL_TIER) {
        list.push({
          key: footY,
          draw: (ctx) => {
            if (occludes(tx, footY, WALL_VISUAL_H + TILE)) ctx.globalAlpha = 0.42;
            ctx.fillStyle = pal.face;
            ctx.fillRect(tx * TILE, ty * TILE - WALL_VISUAL_H + TILE, TILE, WALL_VISUAL_H);
            ctx.fillStyle = pal.wall;
            ctx.fillRect(tx * TILE, ty * TILE - WALL_VISUAL_H, TILE, TILE);
            ctx.globalAlpha = 1;
          },
        });
      } else if (south !== WALL_TIER && south < tier && !lvl.rampAtTile(tx, ty + 1)) {
        // south-facing cliff face of elevated ground
        const drop = (tier - south) * TIER_H;
        list.push({
          key: footY,
          draw: (ctx) => {
            if (occludes(tx, footY, tier * TIER_H)) ctx.globalAlpha = 0.42;
            ctx.fillStyle = pal.face;
            ctx.fillRect(tx * TILE, footY - tier * TIER_H, TILE, drop);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(tx * TILE, footY - tier * TIER_H, TILE, 1.5);
            ctx.globalAlpha = 1;
          },
        });
      }
    }
  }

  // locked gates: iron bars until they grind open
  for (const g of lvl.gates) {
    if (g.open) continue;
    const footY = (g.ty + g.h) * TILE;
    const baseZ = TIER_H; // all current gates stand on street tier
    list.push({
      key: footY,
      draw: (ctx) => {
        const x0 = g.tx * TILE, w = g.w * TILE, hpx = g.h * TILE;
        const top = footY - baseZ - 40;
        ctx.fillStyle = '#241f28';
        ctx.fillRect(x0, top, w, footY - baseZ - top);
        ctx.strokeStyle = '#4a4152';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (w >= hpx) {
          for (let bx = x0 + 3; bx < x0 + w; bx += 5) { ctx.moveTo(bx, top); ctx.lineTo(bx, footY - baseZ); }
        } else {
          for (let by = top + 3; by < footY - baseZ; by += 5) { ctx.moveTo(x0, by); ctx.lineTo(x0 + w, by); }
        }
        ctx.stroke();
      },
    });
  }

  // elevators: wooden platform at its current height + chains to the head-frame
  for (const el of lvl.elevators) {
    list.push({
      key: el.ty * TILE + 0.5, // after the cliff face behind it, before riders
      draw: (ctx) => {
        const x0 = el.tx * TILE, y0 = el.ty * TILE, w = el.w * TILE, h = el.h * TILE;
        const sy = backdrop() ? y0 : y0 - el.z;
        ctx.strokeStyle = '#4a4148';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x0 + 3, sy + 2); ctx.lineTo(x0 + 3, y0 - el.highZ - 26);
        ctx.moveTo(x0 + w - 3, sy + 2); ctx.lineTo(x0 + w - 3, y0 - el.highZ - 26);
        ctx.stroke();
        ctx.fillStyle = '#4c3a2c';
        ctx.fillRect(x0, sy, w, h);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        for (let px = x0 + 4; px < x0 + w; px += 6) {
          ctx.beginPath(); ctx.moveTo(px, sy); ctx.lineTo(px, sy + h); ctx.stroke();
        }
        const wob = el.target !== null ? Math.sin(time * 30) * 0.6 : 0;
        ctx.fillStyle = '#3a3231';
        ctx.fillRect(x0 + w / 2 - 2 + wob, y0 - el.highZ - 30, 4, 6);
      },
    });
  }
  // ladders (drawn on their wall face)
  for (const l of lvl.ladders) {
    const x = l.tx * TILE;
    const footY = (l.ty + 1) * TILE;
    list.push({
      key: footY - 0.5,
      draw: (ctx) => {
        ctx.strokeStyle = '#6a5a44';
        ctx.lineWidth = 1.5;
        const top = backdrop() ? footY - 42 : footY - l.highZ - 10;
        const bottom = l.locked ? top + 24 : footY - (backdrop() ? 0 : l.lowZ); // pulled up
        ctx.beginPath();
        ctx.moveTo(x + 4, bottom); ctx.lineTo(x + 4, top);
        ctx.moveTo(x + 12, bottom); ctx.lineTo(x + 12, top);
        for (let ry = bottom - 3; ry > top; ry -= 5) { ctx.moveTo(x + 4, ry); ctx.lineTo(x + 12, ry); }
        ctx.stroke();
      },
    });
  }
}

function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, groundZ: number, r: number) {
  const gap = z - groundZ;
  const scale = Math.max(0.35, 1 - gap / 90);
  ctx.fillStyle = `rgba(0,0,0,${0.35 * scale})`;
  ctx.beginPath();
  ctx.ellipse(x, y - groundZ, r * scale, r * 0.45 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
}

function collectEntities(list: Drawable[], game: Game, time: number) {
  const { lvl } = game;

  for (const lamp of lvl.lamps) {
    list.push({
      key: lamp.y,
      draw: (ctx) => {
        const flicker = 0.85 + 0.15 * Math.sin(time * 13 + lamp.x);
        ctx.fillStyle = '#2a2430';
        ctx.fillRect(lamp.x - 1.5, lamp.y - 26, 3, 26);
        ctx.fillStyle = COLORS.lampGlow;
        ctx.globalAlpha = flicker;
        ctx.fillRect(lamp.x - 4, lamp.y - 32, 8, 8);
        ctx.globalAlpha = 1;
      },
    });
  }

  if (game.dustDrop) {
    const d = game.dustDrop;
    list.push({
      key: d.y,
      draw: (ctx) => {
        const pulse = 3 + Math.sin(time * 5) * 1.2;
        ctx.fillStyle = '#c94b5e';
        ctx.save();
        ctx.translate(d.x, d.y - vz(d.x, d.y, d.z) - 6);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-pulse / 2, -pulse / 2, pulse, pulse);
        ctx.restore();
      },
    });
  }

  for (const e of game.enemies) {
    if (!e.alive) continue;
    list.push({ key: e.pos.y, draw: (ctx) => drawEnemy(ctx, e, game, time) });
  }

  if (!game.player.dead) {
    list.push({ key: game.player.pos.y, draw: (ctx) => drawPlayer(ctx, game.player, lvl) });
  }

  const brute = game.brute;
  if (brute && (brute.alive || brute.defeated)) {
    list.push({ key: brute.pos.y, draw: (ctx) => drawBrute(ctx, brute, game) });
  }

  for (const pr of game.lvl.props) {
    if (backdrop() && pr.type !== 'crystal' && pr.type !== 'gallows' && pr.type !== 'post') continue; // painted in
    list.push({ key: pr.y, draw: (ctx) => drawProp(ctx, pr.x, pr.y, pr.type, time) });
  }

  const grist = game.grist;
  if (grist && grist.alive) {
    list.push({ key: grist.pos.y, draw: (ctx) => drawGrist(ctx, grist, game) });
  }
  if (game.gristHook && grist) {
    const h = game.gristHook;
    list.push({
      key: h.y,
      draw: (ctx) => {
        ctx.strokeStyle = '#8a8078';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(grist.pos.x, grist.pos.y - grist.pos.z - 10);
        ctx.lineTo(h.x, h.y - grist.pos.z - 6);
        ctx.stroke();
        ctx.fillStyle = '#c9c0b4';
        ctx.fillRect(h.x - 2, h.y - grist.pos.z - 8, 4, 4);
      },
    });
  }

  for (const n of game.lvl.npcs) {
    if (!game.npcVisible(n.id)) continue;
    const gz = game.lvl.groundZAt(n.x, n.y);
    list.push({
      key: n.y,
      draw: (ctx) => {
        shadow(ctx, n.x, n.y, 0, 0, 5);
        const img = sprites.get(`${n.id}_s`);
        if (img) drawSprite(ctx, img, n.x, n.y);
        else {
          ctx.fillStyle = '#5a5264';
          ctx.fillRect(n.x - 4, n.y - 13, 8, 13);
        }
        const near = Math.hypot(game.player.pos.x - n.x, game.player.pos.y - n.y) < 26;
        if (near && !game.dialogue) {
          ctx.fillStyle = 'rgba(220, 205, 180, 0.85)';
          ctx.font = 'italic 8px Georgia, serif';
          ctx.textAlign = 'center';
          ctx.fillText('[E] speak', n.x, n.y - 32);
        }
      },
    });
  }

  const cassar = game.cassar;
  if (cassar && cassar.alive) {
    list.push({ key: cassar.pos.y, draw: (ctx) => drawCassar(ctx, cassar, game, time) });
  }

  const mother = game.mother;
  if (mother && mother.alive) {
    list.push({ key: mother.pos.y, draw: (ctx) => drawMother(ctx, mother, game, time) });
  }

  // the Heartseam: the exposed heart of the Marrowed King
  if (game.heartseam) {
    const h = game.heartseam;
    list.push({
      key: h.y,
      draw: (ctx) => {
        const pulse = 0.7 + 0.3 * Math.sin(time * 2.2);
        const g = ctx.createRadialGradient(h.x, h.y - 10, 2, h.x, h.y - 10, 26);
        g.addColorStop(0, `rgba(240, 80, 100, ${0.9 * pulse})`);
        g.addColorStop(1, 'rgba(120, 10, 25, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(h.x - 26, h.y - 36, 52, 52);
        ctx.fillStyle = `rgba(212, 49, 72, ${pulse})`;
        ctx.save();
        ctx.translate(h.x, h.y - 10);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-6, -6, 12, 12);
        ctx.restore();
        ctx.fillStyle = 'rgba(220, 205, 180, 0.6)';
        ctx.font = 'italic 8px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('[E] reach into the seam', h.x, h.y + 14);
      },
    });
  }

  // bloodgem caches
  for (const pk of game.lvl.pickups) {
    if (game.flags.gemsTaken.has(pk.gem)) continue;
    const gz = game.lvl.groundZAt(pk.x, pk.y);
    list.push({
      key: pk.y,
      draw: (ctx) => {
        const pulse = 3.2 + Math.sin(time * 4 + pk.x) * 1.1;
        ctx.fillStyle = '#d43148';
        ctx.save();
        ctx.translate(pk.x, pk.y - 5);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-pulse / 2, -pulse / 2, pulse, pulse);
        ctx.restore();
      },
    });
  }

  for (const s of game.enemyShots) {
    list.push({
      key: s.y,
      draw: (ctx) => {
        ctx.strokeStyle = '#e8d9a0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - vz(s.x, s.y, s.z));
        ctx.lineTo(s.x - s.vx * 0.02, s.y - s.vy * 0.02 - vz(s.x, s.y, s.z));
        ctx.stroke();
      },
    });
  }

  for (const s of game.shards) {
    list.push({
      key: s.y,
      draw: (ctx) => {
        ctx.strokeStyle = '#f0e6d0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - vz(s.x, s.y, s.z));
        ctx.lineTo(s.x - s.vx * 0.016, s.y - s.vy * 0.016 - vz(s.x, s.y, s.z));
        ctx.stroke();
      },
    });
  }

  for (const p of game.particles.list) {
    list.push({
      key: p.y,
      draw: (ctx) => {
        ctx.globalAlpha = 1 - p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - vz(p.x, p.y, p.z) - p.size / 2, p.size, p.size);
        ctx.globalAlpha = 1;
      },
    });
  }
}

function playerDir(p: Player): string {
  const c = Math.cos(p.aim), s = Math.sin(p.aim);
  return Math.abs(c) > Math.abs(s) ? (c > 0 ? 'e' : 'w') : (s > 0 ? 's' : 'n');
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, lvl: Level) {
  const h = p.climbing ? 0 : vz(p.pos.x, p.pos.y, p.pos.z);
  shadow(ctx, p.pos.x, p.pos.y, h, 0, 6);
  const x = p.pos.x, y = p.pos.y - h;

  if (p.invulnerable && p.visceralT <= 0) ctx.globalAlpha = 0.55; // dash i-frame shimmer

  const bob = Math.abs(Math.sin(p.walkPhase)) * 1.3;
  const dir = playerDir(p);
  // frame selection: attack poses > walk cycle (base→b→base→c) > idle
  let frame = `player_${dir}`;
  if (p.attack) {
    frame = p.attack.phase === 'windup' ? `atk_${dir}_a` : `atk_${dir}_b`;
  } else if (p.moving) {
    const step = Math.floor(p.walkPhase / (Math.PI / 2)) % 4;
    frame = step === 1 ? `player_${dir}_b` : step === 3 ? `player_${dir}_c` : `player_${dir}`;
  }
  const img = sprites.get(frame) ?? sprites.get(`player_${dir}`);
  if (img) {
    drawSprite(ctx, img, x, y - bob, p.flashT > 0);
  } else {
    // tofu fallback until sprites load
    ctx.fillStyle = p.flashT > 0 ? '#ffffff' : '#3a3440';
    ctx.fillRect(x - 4, y - 13, 8, 13);
    ctx.fillStyle = p.flashT > 0 ? '#ffffff' : '#d8c9a8';
    ctx.fillRect(x - 2.5, y - 17, 5, 4);
    ctx.fillStyle = p.flashT > 0 ? '#ffffff' : '#242028';
    ctx.fillRect(x - 4.5, y - 19, 9, 3);
  }

  // crescent slash VFX — the weapon lives in the sprite's hands now
  if (p.attack && (p.attack.phase === 'active' || (p.attack.phase === 'recover' && p.attack.t < 0.08))) {
    const a = p.attack;
    const c = a.cfg;
    const t = a.phase === 'active' ? a.t / c.active : 1;
    const fade = a.phase === 'recover' ? 1 - a.t / 0.08 : 1;
    const SLASH: Record<string, [string, string]> = {
      pick: ['rgba(240, 230, 208,', 'rgba(240, 230, 208,'],
      longpick: ['rgba(232, 196, 130,', 'rgba(240, 230, 208,'],
      rapier: ['rgba(216, 232, 240,', 'rgba(255, 255, 255,'],
      greatsword: ['rgba(212, 49, 72,', 'rgba(240, 120, 140,'],
    };
    const [fill, edge] = a.bonus > 1 ? SLASH.greatsword : SLASH[c.style];
    const sweep = Math.min(1, t * 1.15);
    const a1 = a.dir - c.arc / 2 + c.arc * sweep;
    const a0 = a1 - Math.min(c.arc * 0.75, 1.5);
    const rO = c.range - 1;
    const rI = c.range * 0.38;
    ctx.beginPath();
    ctx.arc(x, y - 6, rO, a0, a1);
    ctx.arc(x, y - 6, rI, a1, a0, true);
    ctx.closePath();
    ctx.fillStyle = `${fill} ${0.34 * fade})`;
    ctx.fill();
    // bright leading edge
    ctx.strokeStyle = `${edge} ${0.85 * fade})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 6, (rO + rI) / 2, a1 - 0.25, a1);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, game: Game, _time: number) {
  const hh = vz(e.pos.x, e.pos.y, e.pos.z);
  shadow(ctx, e.pos.x, e.pos.y, hh, 0, 6);
  const x = e.pos.x, y = e.pos.y - hh;

  // wind-up telegraphs (red = dodge)
  if (e.state === 'windup' && !e.isSniper) {
    const windup = e.kind === 'hound' ? HOUND.windup : RABBLE.windup;
    const range = e.kind === 'hound' ? 16 : RABBLE.range;
    const progress = e.stateT / windup;
    const dir = Math.atan2(game.player.pos.y - e.pos.y, game.player.pos.x - e.pos.x);
    ctx.strokeStyle = 'rgba(212, 49, 72, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(e.pos.x, e.pos.y - vz(e.pos.x, e.pos.y, e.pos.z));
    ctx.arc(e.pos.x, e.pos.y - vz(e.pos.x, e.pos.y, e.pos.z), range, dir - RABBLE.arc / 2, dir + RABBLE.arc / 2);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = `rgba(212, 49, 72, ${0.12 + 0.25 * progress})`;
    ctx.fill();
  }
  // watchman laser-sight: tracks, then locks bright (the dodge cue)
  if (e.isSniper && e.state === 'windup') {
    ctx.strokeStyle = e.aimLocked ? 'rgba(255, 90, 100, 0.9)' : 'rgba(212, 49, 72, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(e.pos.x, e.pos.y - vz(e.pos.x, e.pos.y, e.pos.z) - 12);
    ctx.lineTo(e.lockX, e.lockY - vz(e.lockX, e.lockY, e.lockZ) - 8);
    ctx.stroke();
  }

  // priest heal pulse: expanding dark-red ring
  if (e.kind === 'priest' && e.healFlashT > 0) {
    const t = 1 - e.healFlashT / 0.4;
    ctx.strokeStyle = `rgba(217, 138, 138, ${0.7 * (1 - t)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(e.pos.x, e.pos.y - vz(e.pos.x, e.pos.y, e.pos.z) - 8, 12 + t * 60, 0, Math.PI * 2);
    ctx.stroke();
  }

  const staggered = e.state === 'stagger';
  const h = staggered ? 9 : 13;
  const white = e.flashT > 0 || e.telegraphFlash;

  const bobE = (e.state === 'chase' || (e.state === 'idle' && e.waypoints)) ? Math.abs(Math.sin(e.stateT * 9)) * 1.2 : 0;
  const img = sprites.get(`${e.kind}_s`);
  if (img) {
    if (staggered) {
      // kneeling: squash the sprite vertically
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.75);
      drawSprite(ctx, img, 0, 0, white);
      ctx.restore();
    } else {
      drawSprite(ctx, img, x, y - bobE, white);
    }
  } else {
    // tofu fallback: hunched body, garnet buboes
    ctx.fillStyle = white ? '#ffffff' : e.state === 'stumble' ? '#4d3a42' : '#403038';
    ctx.fillRect(x - 4.5, y - h, 9, h);
    ctx.fillStyle = white ? '#ffffff' : '#8a2432';
    ctx.fillRect(x - 2, y - h - 3, 5, 4);
    if (!white) {
      ctx.fillStyle = COLORS.bloodBright;
      ctx.fillRect(x + 1.5, y - h + 3, 2, 2);
      ctx.fillRect(x - 3, y - h + 7, 2, 2);
    }
  }

  if (staggered) {
    // visceral window marker
    const pulse = 0.6 + 0.4 * Math.sin(e.stateT * 12);
    ctx.fillStyle = `rgba(212, 49, 72, ${pulse})`;
    ctx.save();
    ctx.translate(x, y - h - 10);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-2.5, -2.5, 5, 5);
    ctx.restore();
  }

  // small hp sliver when damaged
  if (e.hp < RABBLE.hp) {
    ctx.fillStyle = '#1a1218';
    ctx.fillRect(x - 7, y - h - 7, 14, 2);
    ctx.fillStyle = COLORS.blood;
    ctx.fillRect(x - 7, y - h - 7, 14 * Math.max(0, e.hp / RABBLE.hp), 2);
  }
}

function drawBrute(ctx: CanvasRenderingContext2D, b: Brute, game: Game) {
  const x = b.pos.x, y = b.pos.y - vz(b.pos.x, b.pos.y, b.pos.z);

  if (!b.alive) {
    // the corpse stays — chains finally still
    const img = sprites.get('brute_s');
    ctx.globalAlpha = 0.55;
    if (img) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.4);
      drawSprite(ctx, img, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    return;
  }

  shadow(ctx, b.pos.x, b.pos.y, vz(b.pos.x, b.pos.y, b.pos.z), 0, 12);

  // telegraphs
  const aimDir = Math.atan2(game.player.pos.y - b.pos.y, game.player.pos.x - b.pos.x);
  if (b.state === 'slam-windup') {
    const progress = b.stateT / BRUTE.slam.windup;
    const cx = b.pos.x + Math.cos(aimDir) * 18;
    const cy = b.pos.y + Math.sin(aimDir) * 18;
    ctx.strokeStyle = 'rgba(212, 49, 72, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy - b.pos.z, BRUTE.slam.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(212, 49, 72, ${0.1 + 0.3 * progress})`;
    ctx.beginPath();
    ctx.arc(cx, cy - b.pos.z, BRUTE.slam.radius * progress, 0, Math.PI * 2);
    ctx.fill();
  } else if (b.state === 'sweep-windup') {
    const progress = b.stateT / BRUTE.sweep.windup;
    ctx.strokeStyle = 'rgba(212, 49, 72, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, BRUTE.sweep.range, aimDir - BRUTE.sweep.arc / 2, aimDir + BRUTE.sweep.arc / 2);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = `rgba(212, 49, 72, ${0.1 + 0.28 * progress})`;
    ctx.fill();
  } else if (b.state === 'charge-windup') {
    ctx.strokeStyle = 'rgba(212, 49, 72, 0.7)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(b.attackDir) * 120, y + Math.sin(b.attackDir) * 120);
    ctx.stroke();
  }

  const white = b.flashT > 0 || b.telegraphFlash;
  const img = sprites.get('brute_s');
  if (b.state === 'dormant') ctx.globalAlpha = 0.75;
  if (img) {
    drawSprite(ctx, img, x, y, white);
  } else {
    ctx.fillStyle = white ? '#ffffff' : '#4a3a38';
    ctx.fillRect(x - 11, y - 30, 22, 30);
    ctx.fillStyle = white ? '#ffffff' : '#8a2432';
    ctx.fillRect(x - 4, y - 36, 8, 7);
  }
  ctx.globalAlpha = 1;

  if (b.state === 'stagger') {
    const pulse = 0.6 + 0.4 * Math.sin(b.stateT * 12);
    ctx.fillStyle = `rgba(212, 49, 72, ${pulse})`;
    ctx.save();
    ctx.translate(x, y - 44);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }
}

function drawMother(ctx: CanvasRenderingContext2D, m: Mother, game: Game, time: number) {
  const x = m.pos.x, y = m.pos.y - vz(m.pos.x, m.pos.y, m.pos.z);

  // phase 2: the dreaming eye opens in the seam behind her
  if (m.phase2) {
    const ex = m.spawn.x, ey = m.spawn.y - 60;
    const blink = 0.75 + 0.25 * Math.sin(time * 1.1);
    const g = ctx.createRadialGradient(ex, ey, 2, ex, ey, 44);
    g.addColorStop(0, `rgba(255, 120, 130, ${0.75 * blink})`);
    g.addColorStop(0.35, `rgba(180, 30, 50, ${0.5 * blink})`);
    g.addColorStop(1, 'rgba(60, 5, 15, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(ex - 44, ey - 44, 88, 88);
    ctx.fillStyle = `rgba(20, 2, 8, ${0.9})`;
    ctx.beginPath();
    ctx.ellipse(ex, ey, 5, 11, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  shadow(ctx, m.pos.x, m.pos.y, vz(m.pos.x, m.pos.y, m.pos.z), 0, 14);

  const aimDir = Math.atan2(game.player.pos.y - m.pos.y, game.player.pos.x - m.pos.x);
  if (m.state === 'claw-windup') {
    const progress = m.stateT / MOTHER.claw.windup;
    ctx.strokeStyle = 'rgba(212, 49, 72, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, MOTHER.claw.range, aimDir - MOTHER.claw.arc / 2, aimDir + MOTHER.claw.arc / 2);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = `rgba(212, 49, 72, ${0.1 + 0.28 * progress})`;
    ctx.fill();
  } else if (m.state === 'ring-windup') {
    const progress = m.stateT / MOTHER.ring.windup;
    ctx.strokeStyle = `rgba(212, 49, 72, ${0.3 + 0.5 * progress})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 18 + progress * 20, 0, Math.PI * 2);
    ctx.stroke();
  } else if (m.state === 'lance-windup') {
    const progress = m.stateT / MOTHER.lance.windup;
    ctx.strokeStyle = `rgba(212, 49, 72, ${0.25 + 0.5 * progress})`;
    ctx.lineWidth = 2;
    for (let i = 0; i < MOTHER.lance.count; i++) {
      const a = aimDir + (i - 1) * MOTHER.lance.spread;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * 130, y + Math.sin(a) * 130);
      ctx.stroke();
    }
  }

  const white = m.flashT > 0 || m.telegraphFlash;
  const img = sprites.get(m.phase2 ? 'mother2_s' : 'mother_s');
  if (m.state === 'dormant') ctx.globalAlpha = 0.8;
  if (img) {
    drawSprite(ctx, img, x, y, white);
  } else {
    ctx.fillStyle = white ? '#ffffff' : '#5a2430';
    ctx.fillRect(x - 14, y - 44, 28, 44);
  }
  ctx.globalAlpha = 1;

  if (m.state === 'stagger') {
    const pulse = 0.6 + 0.4 * Math.sin(m.stateT * 12);
    ctx.fillStyle = `rgba(212, 49, 72, ${pulse})`;
    ctx.save();
    ctx.translate(x, y - 58);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }
}

function drawGrist(ctx: CanvasRenderingContext2D, g: Grist, game: Game) {
  const x = g.pos.x, y = g.pos.y - vz(g.pos.x, g.pos.y, g.pos.z);
  shadow(ctx, g.pos.x, g.pos.y, vz(g.pos.x, g.pos.y, g.pos.z), 0, 11);

  const aimDir = Math.atan2(game.player.pos.y - g.pos.y, game.player.pos.x - g.pos.x);
  if (g.state === 'sweep-windup') {
    const progress = g.stateT / GRIST.sweep.windup;
    ctx.strokeStyle = 'rgba(212, 49, 72, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, GRIST.sweep.range, aimDir - GRIST.sweep.arc / 2, aimDir + GRIST.sweep.arc / 2);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = `rgba(212, 49, 72, ${0.08 + 0.25 * progress})`;
    ctx.fill();
  } else if (g.state === 'slam-windup') {
    const progress = g.stateT / GRIST.slam.windup;
    const cx = x + Math.cos(aimDir) * 16;
    const cy = y + Math.sin(aimDir) * 16;
    ctx.strokeStyle = 'rgba(212, 49, 72, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, GRIST.slam.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(212, 49, 72, ${0.1 + 0.3 * progress})`;
    ctx.beginPath();
    ctx.arc(cx, cy, GRIST.slam.radius * progress, 0, Math.PI * 2);
    ctx.fill();
  } else if (g.state === 'hook-windup') {
    ctx.strokeStyle = 'rgba(212, 49, 72, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + Math.cos(g.attackDir) * 150, y - 10 + Math.sin(g.attackDir) * 150);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // cart swings visibly during the sweep
  if (g.state === 'sweep') {
    const t = g.stateT / GRIST.sweep.active;
    const a = g.attackDir - GRIST.sweep.arc / 2 + GRIST.sweep.arc * t;
    const cx = x + Math.cos(a) * (GRIST.sweep.range - 8);
    const cy = y + Math.sin(a) * (GRIST.sweep.range - 8);
    ctx.strokeStyle = '#8a8078';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    ctx.fillStyle = '#5a5048';
    ctx.fillRect(cx - 5, cy - 5, 10, 8);
  }

  const white = g.flashT > 0 || g.telegraphFlash;
  const img = sprites.get('grist_s');
  if (g.state === 'dormant') ctx.globalAlpha = 0.8;
  if (img) drawSprite(ctx, img, x, y, white);
  else {
    ctx.fillStyle = white ? '#ffffff' : '#4a3a38';
    ctx.fillRect(x - 10, y - 28, 20, 28);
  }
  ctx.globalAlpha = 1;

  if (g.state === 'stagger') {
    const pulse = 0.6 + 0.4 * Math.sin(g.stateT * 12);
    ctx.fillStyle = `rgba(212, 49, 72, ${pulse})`;
    ctx.save();
    ctx.translate(x, y - 42);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }
}

function drawProp(ctx: CanvasRenderingContext2D, x: number, y: number, type: string, time: number) {
  switch (type) {
    case 'crate':
      ctx.fillStyle = '#463527';
      ctx.fillRect(x - 6, y - 11, 12, 11);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 6, y - 11, 12, 11);
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 11); ctx.lineTo(x + 6, y);
      ctx.stroke();
      break;
    case 'barrel':
      ctx.fillStyle = '#3d2f22';
      ctx.beginPath();
      ctx.ellipse(x, y - 5, 5, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5a4a38';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y - 5);
      ctx.stroke();
      break;
    case 'stall': {
      ctx.fillStyle = '#3a2d24';
      ctx.fillRect(x - 12, y - 8, 24, 8);
      ctx.fillStyle = '#59222c';
      ctx.fillRect(x - 14, y - 22, 28, 6);
      ctx.fillStyle = '#2a2028';
      ctx.fillRect(x - 12, y - 16, 2, 8);
      ctx.fillRect(x + 10, y - 16, 2, 8);
      break;
    }
    case 'post': {
      const flick = 0.8 + 0.2 * Math.sin(time * 11 + x);
      ctx.fillStyle = '#2a2430';
      ctx.fillRect(x - 1, y - 24, 2, 24);
      ctx.globalAlpha = flick;
      ctx.fillStyle = COLORS.lampGlow;
      ctx.fillRect(x - 3, y - 29, 6, 6);
      ctx.globalAlpha = 1;
      break;
    }
    case 'crystal': {
      const glow = 0.6 + 0.4 * Math.sin(time * 1.8 + x * 0.7);
      ctx.fillStyle = `rgba(212, 49, 72, ${0.5 * glow})`;
      ctx.beginPath();
      ctx.moveTo(x - 7, y); ctx.lineTo(x - 3, y - 14); ctx.lineTo(x, y);
      ctx.moveTo(x - 1, y); ctx.lineTo(x + 3, y - 19); ctx.lineTo(x + 7, y);
      ctx.fill();
      ctx.fillStyle = `rgba(240, 100, 120, ${0.5 * glow})`;
      ctx.beginPath();
      ctx.moveTo(x + 1, y); ctx.lineTo(x + 3, y - 12); ctx.lineTo(x + 5, y);
      ctx.fill();
      break;
    }
    case 'cart':
      ctx.fillStyle = '#3a332e';
      ctx.fillRect(x - 8, y - 10, 16, 8);
      ctx.fillStyle = '#241f1c';
      ctx.beginPath();
      ctx.arc(x - 4, y - 1, 2.5, 0, Math.PI * 2);
      ctx.arc(x + 4, y - 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'beam':
      ctx.fillStyle = '#33261c';
      ctx.fillRect(x - 2, y - 34, 4, 34);
      ctx.fillRect(x - 8, y - 34, 16, 3);
      break;
    case 'gallows': {
      ctx.fillStyle = '#2c2119';
      ctx.fillRect(x - 2, y - 42, 4, 42);           // post
      ctx.fillRect(x - 2, y - 42, 22, 3);           // arm
      ctx.strokeStyle = '#4a4038';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 16, y - 39);
      ctx.lineTo(x + 16, y - 28);
      ctx.stroke();
      const sway = Math.sin(time * 0.7 + x) * 1.2;  // the rope is not empty
      ctx.fillStyle = '#1d1820';
      ctx.fillRect(x + 13 + sway, y - 28, 6, 12);
      ctx.fillRect(x + 14.5 + sway, y - 31, 3, 4);
      break;
    }
    case 'grave':
      ctx.fillStyle = '#3c3844';
      ctx.fillRect(x - 4, y - 9, 8, 9);
      ctx.beginPath();
      ctx.arc(x, y - 9, 4, Math.PI, 0);
      ctx.fill();
      break;
  }
}

function drawCassar(ctx: CanvasRenderingContext2D, c: Cassar, game: Game, time: number) {
  const x = c.pos.x, y = c.pos.y - vz(c.pos.x, c.pos.y, c.pos.z);
  shadow(ctx, c.pos.x, c.pos.y, vz(c.pos.x, c.pos.y, c.pos.z), 0, 6);

  const aimDir = Math.atan2(game.player.pos.y - c.pos.y, game.player.pos.x - c.pos.x);
  // combo telegraph — a duelist's thrust line, not a mob's arc
  if (c.state === 'combo1' || c.state === 'combo2') {
    ctx.strokeStyle = 'rgba(212, 49, 72, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x + Math.cos(c.attackDir) * CASSAR.combo.range, y - 8 + Math.sin(c.attackDir) * CASSAR.combo.range);
    ctx.stroke();
  }
  if (c.state === 'shot-windup') {
    ctx.strokeStyle = 'rgba(212, 49, 72, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y - 10);
    ctx.lineTo(x + Math.cos(aimDir) * 120, y - 10 + Math.sin(aimDir) * 120);
    ctx.stroke();
  }

  const white = c.flashT > 0 || c.telegraphFlash;
  const img = sprites.get('cassar_s');
  if (c.state === 'quickstep') ctx.globalAlpha = 0.55;
  if (c.state === 'duel-bow') {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.9); // the bow
    if (img) drawSprite(ctx, img, 0, 0, white);
    ctx.restore();
  } else if (img) {
    drawSprite(ctx, img, x, y, white);
  } else {
    ctx.fillStyle = white ? '#ffffff' : '#33202a';
    ctx.fillRect(x - 4, y - 15, 8, 15);
  }
  ctx.globalAlpha = 1;

  // COUNTER-STANCE: the raised pistol glints — the one warning you get
  if (c.state === 'counter') {
    const glint = 0.5 + 0.5 * Math.sin(time * 14);
    ctx.fillStyle = `rgba(245, 233, 200, ${glint})`;
    ctx.beginPath();
    ctx.arc(x + 6, y - 18, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(245, 233, 200, ${glint * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + 6, y - 18, 4.5 + glint * 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (c.state === 'stagger') {
    const pulse = 0.6 + 0.4 * Math.sin(c.stateT * 12);
    ctx.fillStyle = `rgba(212, 49, 72, ${pulse})`;
    ctx.save();
    ctx.translate(x, y - 26);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-2.5, -2.5, 5, 5);
    ctx.restore();
  }
}

function drawFloatTexts(ctx: CanvasRenderingContext2D, game: Game) {
  ctx.textAlign = 'center';
  ctx.font = '700 8px Georgia, serif';
  for (const t of game.texts) {
    ctx.globalAlpha = Math.min(1, t.life * 3);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y - vz(t.x, t.y, t.z));
  }
  ctx.globalAlpha = 1;
}

// ambient atmosphere: drifting embers over the city, sinking spores in the mine
interface Mote { x: number; y: number; vx: number; vy: number; phase: number }
const motes: Mote[] = [];
let moteLevel = '';

function drawAtmosphere(ctx: CanvasRenderingContext2D, game: Game, time: number) {
  const cam = game.camera;
  const ember = game.lvl.name === 'ember';
  if (moteLevel !== game.lvl.name) {
    moteLevel = game.lvl.name;
    motes.length = 0;
    for (let i = 0; i < 46; i++) {
      motes.push({
        x: cam.x + Math.random() * VIEW_W,
        y: cam.y + Math.random() * VIEW_H,
        vx: (Math.random() - 0.3) * (ember ? 7 : 3),
        vy: ember ? -(4 + Math.random() * 9) : 5 + Math.random() * 7,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }
  for (const m of motes) {
    m.x += m.vx / 60 + Math.sin(time * 0.8 + m.phase) * 0.12;
    m.y += m.vy / 60;
    // wrap around the current viewport
    if (m.x < cam.x - 8) m.x += VIEW_W + 16;
    if (m.x > cam.x + VIEW_W + 8) m.x -= VIEW_W + 16;
    if (m.y < cam.y - 8) m.y += VIEW_H + 16;
    if (m.y > cam.y + VIEW_H + 8) m.y -= VIEW_H + 16;
    const s = cam.toScreen(m.x, m.y);
    const tw = 0.35 + 0.3 * Math.sin(time * 2.2 + m.phase);
    ctx.fillStyle = ember
      ? `rgba(232, 150, 60, ${tw})`
      : `rgba(212, 60, 80, ${tw * 0.8})`;
    const size = 1 + (m.phase % 1);
    ctx.fillRect(s.x, s.y, size, size);
  }
}

// dynamic point lights over darkness — lamps flicker (the Rubinite touch)
function drawLighting(ctx: CanvasRenderingContext2D, game: Game, time: number) {
  if (!lightCanvas) {
    lightCanvas = document.createElement('canvas');
    lightCanvas.width = VIEW_W;
    lightCanvas.height = VIEW_H;
  }
  const lctx = lightCanvas.getContext('2d')!;
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, VIEW_W, VIEW_H);
  lctx.fillStyle = `rgba(5, 2, 9, ${game.lvl.palette.darkness})`;
  lctx.fillRect(0, 0, VIEW_W, VIEW_H);

  lctx.globalCompositeOperation = 'destination-out';
  const punch = (wx: number, wy: number, r: number, strength: number) => {
    const s = game.camera.toScreen(wx, wy);
    const g = lctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
    g.addColorStop(0, `rgba(0,0,0,${strength})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = g;
    lctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
  };

  for (const lamp of game.lvl.lamps) {
    const flicker = 1 + 0.06 * Math.sin(time * 13 + lamp.x) + 0.03 * Math.sin(time * 31);
    punch(lamp.x, lamp.y - 30, 95 * flicker, 0.95);
  }
  const p = game.player;
  if (!p.dead) punch(p.pos.x, p.pos.y - p.pos.z, 70, 0.8);

  ctx.drawImage(lightCanvas, 0, 0);

  // warm additive glow pass — gaslight is amber, gem-light is red
  ctx.globalCompositeOperation = 'lighter';
  const glow = (wx: number, wy: number, r: number, color: string) => {
    const s = game.camera.toScreen(wx, wy);
    if (s.x < -r || s.x > VIEW_W + r || s.y < -r || s.y > VIEW_H + r) return;
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2);
  };
  const ember = game.lvl.name === 'ember';
  for (const lamp of game.lvl.lamps) {
    const fl = 1 + 0.08 * Math.sin(time * 13 + lamp.x);
    glow(lamp.x, lamp.y - 30, 80 * fl, ember ? 'rgba(210, 140, 40, 0.11)' : 'rgba(200, 60, 60, 0.10)');
  }
  for (const pr of game.lvl.props) {
    if (pr.type === 'post') glow(pr.x, pr.y - 24, 55, 'rgba(210, 140, 40, 0.08)');
    if (pr.type === 'crystal') glow(pr.x, pr.y - 8, 48, 'rgba(212, 49, 72, 0.10)');
  }
  if (game.heartseam) glow(game.heartseam.x, game.heartseam.y - 10, 90, 'rgba(240, 80, 100, 0.14)');
  ctx.globalCompositeOperation = 'source-over';
}
