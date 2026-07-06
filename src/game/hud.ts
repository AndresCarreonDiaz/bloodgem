import { PLAYER, COLORS, VIEW_W, VIEW_H } from './constants';
import type { Game } from './game';
import { SKILL_BRANCHES, MAX_RANK, skillCost, GEMS } from './skills';

export function drawHud(ctx: CanvasRenderingContext2D, game: Game, mouse: { x: number; y: number }) {
  const p = game.player;

  // HP bar with rally segment (orange = recoverable by attacking)
  const bx = 14, by = 12, bw = 170, bh = 7;
  ctx.fillStyle = '#191218';
  ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
  ctx.fillStyle = '#241a1e';
  ctx.fillRect(bx, by, bw, bh);
  const hpW = (p.hp / p.stats.maxHp) * bw;
  ctx.fillStyle = COLORS.blood;
  ctx.fillRect(bx, by, hpW, bh);
  if (p.rally > 0) {
    const rallyW = Math.min(p.rally / p.stats.maxHp, 1 - p.hp / p.stats.maxHp) * bw;
    ctx.fillStyle = COLORS.rally;
    ctx.globalAlpha = 0.5 + 0.5 * Math.min(1, p.rallyT / 1.5);
    ctx.fillRect(bx + hpW, by, rallyW, bh);
    ctx.globalAlpha = 1;
  }

  // stamina
  ctx.fillStyle = '#161a14';
  ctx.fillRect(bx, by + bh + 3, bw * 0.8, 4);
  ctx.fillStyle = COLORS.stamina;
  ctx.fillRect(bx, by + bh + 3, (p.stamina / PLAYER.stamina) * bw * 0.8, 4);

  // gemwater phials
  for (let i = 0; i < PLAYER.phials; i++) {
    const px = bx + 18 + i * 12;
    const py = by + bh + 16;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = i < p.phials ? '#b23648' : '#332229';
    ctx.fillRect(-3, -3, 6, 6);
    ctx.restore();
  }
  if (p.drinkT > 0) {
    ctx.fillStyle = 'rgba(178, 54, 72, 0.8)';
    ctx.font = 'italic 9px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('drinking…', bx + 18 + PLAYER.phials * 12 + 6, by + bh + 19);
  }

  // weapon form
  ctx.textAlign = 'left';
  ctx.font = 'italic 9px Georgia, serif';
  ctx.fillStyle = 'rgba(220, 205, 180, 0.55)';
  ctx.fillText(`${p.form.name}   [Q]${p.ownedWeapons.length > 1 ? '  ·  [X] swap' : ''}`, 14, VIEW_H - 14);

  // lucidity — the pale eye
  if (game.lucidity > 0) {
    ctx.textAlign = 'right';
    ctx.font = '700 10px Georgia, serif';
    ctx.fillStyle = '#b9c4d8';
    ctx.fillText(String(game.lucidity), VIEW_W - 26, VIEW_H - 34);
    ctx.strokeStyle = 'rgba(185, 196, 216, 0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(VIEW_W - 16, VIEW_H - 37, 5, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(185, 196, 216, 0.8)';
    ctx.beginPath();
    ctx.arc(VIEW_W - 16, VIEW_H - 37, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // gemdust counter
  ctx.textAlign = 'right';
  ctx.font = '700 11px Georgia, serif';
  ctx.fillStyle = '#c94b5e';
  ctx.fillText(String(p.gemdust), VIEW_W - 26, VIEW_H - 16);
  ctx.save();
  ctx.translate(VIEW_W - 16, VIEW_H - 20);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-3, -3, 6, 6);
  ctx.restore();

  // shard (parry) cooldown pip
  ctx.beginPath();
  ctx.arc(bx + 6, by + bh + 16, 4, 0, Math.PI * 2);
  ctx.fillStyle = p.shardCd <= 0 ? '#f0e6d0' : '#4a4040';
  ctx.fill();

  // crosshair
  ctx.strokeStyle = 'rgba(240, 230, 208, 0.75)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(mouse.x, mouse.y, 3.5, 0, Math.PI * 2);
  ctx.stroke();

  // boss bar (whichever boss is active)
  const boss = game.activeBoss;
  if (boss) {
    const bbw = 300, bbx = (VIEW_W - bbw) / 2, bby = VIEW_H - 34;
    ctx.textAlign = 'center';
    ctx.font = '700 11px Georgia, serif';
    ctx.fillStyle = 'rgba(220, 205, 180, 0.85)';
    ctx.fillText(boss.name, VIEW_W / 2, bby - 5);
    ctx.fillStyle = '#191218';
    ctx.fillRect(bbx - 2, bby - 2, bbw + 4, 9);
    ctx.fillStyle = '#241a1e';
    ctx.fillRect(bbx, bby, bbw, 5);
    ctx.fillStyle = COLORS.blood;
    ctx.fillRect(bbx, bby, bbw * Math.max(0, boss.hp / boss.maxHp), 5);
  }

  // phase 2: the eye is watching — persistent red vignette
  if (game.mother?.alive && game.mother.phase2) {
    const g2 = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.3, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.72);
    g2.addColorStop(0, 'rgba(150, 20, 35, 0)');
    g2.addColorStop(1, 'rgba(150, 20, 35, 0.22)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  // area title (Bloodborne-style) + transition fade
  if (game.fadeT > 0) {
    ctx.fillStyle = `rgba(5, 2, 8, ${Math.min(1, game.fadeT * 1.6)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  if (game.areaTitle) {
    const t = game.areaTitle.t;
    const alpha = Math.min(1, (3 - t) * 2, t * 1.2);
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(220, 205, 180, ${Math.max(0, alpha)})`;
    ctx.font = '700 30px Georgia, serif';
    ctx.fillText(game.areaTitle.text, VIEW_W / 2, VIEW_H / 2 - 40);
    ctx.strokeStyle = `rgba(158, 28, 44, ${Math.max(0, alpha) * 0.8})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(VIEW_W / 2 - 90, VIEW_H / 2 - 28);
    ctx.lineTo(VIEW_W / 2 + 90, VIEW_H / 2 - 28);
    ctx.stroke();
  }

  // death overlay — retry stays under 2 seconds, no ceremony beyond the words
  if (p.dead) {
    ctx.fillStyle = 'rgba(20, 2, 6, 0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.bloodBright;
    ctx.font = '700 34px Georgia, serif';
    ctx.fillText('YOU CRUMBLED', VIEW_W / 2, VIEW_H / 2 - 6);
    if (game.dustDrop) {
      ctx.fillStyle = 'rgba(180, 165, 140, 0.7)';
      ctx.font = 'italic 11px Georgia, serif';
      ctx.fillText('your gemdust lies where you fell', VIEW_W / 2, VIEW_H / 2 + 16);
    }
  } else if (p.hp < p.stats.maxHp * 0.3) {
    // low-hp heartbeat vignette
    const pulse = 0.12 + 0.08 * Math.sin(performance.now() / 180);
    const g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.75);
    g.addColorStop(0, 'rgba(120, 10, 20, 0)');
    g.addColorStop(1, `rgba(120, 10, 20, ${pulse})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  if (game.paused) drawPause(ctx, game);
  if (game.dialogue) drawDialogue(ctx, game);
  if (game.menuOpen) drawVigilMenu(ctx, game);
  if (game.endingChoice) drawEndingChoice(ctx, game);
  if (game.ending) drawEndingCard(ctx, game.ending);
}

function drawPause(ctx: CanvasRenderingContext2D, game: Game) {
  ctx.fillStyle = 'rgba(5, 3, 8, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.bloodBright;
  ctx.font = '700 24px Georgia, serif';
  ctx.fillText('THE HUNT PAUSES', VIEW_W / 2, 74);
  ctx.fillStyle = '#dccdb4';
  ctx.font = 'italic 12px Georgia, serif';
  ctx.fillText(game.objective, VIEW_W / 2, 104);
  const lines = [
    'WASD  move        ·  mouse  aim',
    'LMB  strike       ·  RMB  shardcaster (parry the flash)',
    'Space  quickstep  ·  Q  transform  ·  X  swap weapon',
    'F  gemwater phial ·  E  speak / rest / open / ride',
    'strike a STAGGERED foe for a visceral',
  ];
  ctx.font = '11px Georgia, serif';
  ctx.fillStyle = 'rgba(220, 205, 180, 0.7)';
  lines.forEach((l, i) => ctx.fillText(l, VIEW_W / 2, 150 + i * 22));
  ctx.fillStyle = 'rgba(220, 205, 180, 0.45)';
  ctx.font = '10px Georgia, serif';
  ctx.fillText('[Esc] resume the night', VIEW_W / 2, VIEW_H - 40);
}

function drawDialogue(ctx: CanvasRenderingContext2D, game: Game) {
  const d = game.dialogue!;
  const w = 460, h = 74, x = (VIEW_W - w) / 2, y = VIEW_H - h - 18;
  panel(ctx, x, y, w, h);
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.bloodBright;
  ctx.font = '700 10px Georgia, serif';
  ctx.fillText(d.name, x + 16, y + 20);
  ctx.fillStyle = 'rgba(220, 205, 180, 0.9)';
  ctx.font = 'italic 11px Georgia, serif';
  ctx.fillText(d.lines[d.idx], x + 16, y + 42);
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(220, 205, 180, 0.4)';
  ctx.font = '9px Georgia, serif';
  ctx.fillText(`[E] ${d.idx + 1}/${d.lines.length}`, x + w - 14, y + h - 12);
}

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = 'rgba(8, 5, 10, 0.93)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(158, 28, 44, 0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);
}

function drawVigilMenu(ctx: CanvasRenderingContext2D, game: Game) {
  const p = game.player;
  const w = 380, h = 250, x = (VIEW_W - w) / 2, y = (VIEW_H - h) / 2;
  panel(ctx, x, y, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#dccdb4';
  ctx.font = '700 15px Georgia, serif';
  ctx.fillText('THE SOUL-GEM', VIEW_W / 2, y + 24);
  ctx.font = 'italic 9px Georgia, serif';
  ctx.fillStyle = 'rgba(220, 205, 180, 0.55)';
  ctx.fillText('“Hold still. Every facet is a small forgetting.” — Maud', VIEW_W / 2, y + 38);

  const total = Object.values(p.skillRanks).reduce((a, v) => a + v, 0);
  const cost = skillCost(total);
  ctx.textAlign = 'left';
  SKILL_BRANCHES.forEach((b, i) => {
    const ry = y + 60 + i * 32;
    const rank = p.skillRanks[b.id] ?? 0;
    ctx.fillStyle = '#dccdb4';
    ctx.font = '700 11px Georgia, serif';
    ctx.fillText(`[${i + 1}] ${b.name}`, x + 22, ry);
    ctx.fillStyle = 'rgba(220, 205, 180, 0.6)';
    ctx.font = '9px Georgia, serif';
    ctx.fillText(b.desc, x + 22, ry + 12);
    for (let r = 0; r < MAX_RANK; r++) {
      ctx.fillStyle = r < rank ? '#d43148' : '#332229';
      ctx.save();
      ctx.translate(x + 300 + r * 14, ry - 3);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-3.5, -3.5, 7, 7);
      ctx.restore();
    }
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = p.gemdust >= cost ? '#c94b5e' : 'rgba(201, 75, 94, 0.4)';
  ctx.font = '700 10px Georgia, serif';
  ctx.fillText(`next facet: ${cost} gemdust   (you carry ${p.gemdust})`, VIEW_W / 2, y + h - 42);
  if (p.gems.length > 0) {
    ctx.fillStyle = 'rgba(220, 205, 180, 0.6)';
    ctx.font = '9px Georgia, serif';
    ctx.fillText(`socketed: ${p.gems.map((g) => GEMS[g]?.name ?? g).join(' · ')}`, VIEW_W / 2, y + h - 28);
  }
  ctx.fillStyle = 'rgba(220, 205, 180, 0.45)';
  ctx.font = '9px Georgia, serif';
  ctx.fillText('[1–4] cut a facet   ·   [E] rise and hunt', VIEW_W / 2, y + h - 12);
}

function drawEndingChoice(ctx: CanvasRenderingContext2D, game: Game) {
  const w = 400, h = 152, x = (VIEW_W - w) / 2, y = (VIEW_H - h) / 2;
  panel(ctx, x, y, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#dccdb4';
  ctx.font = '700 14px Georgia, serif';
  ctx.fillText('THE HEART OF THE MARROWED KING', VIEW_W / 2, y + 28);
  ctx.font = 'italic 10px Georgia, serif';
  ctx.fillStyle = 'rgba(220, 205, 180, 0.6)';
  ctx.fillText('It is warm. It does not know you are here. It dreams.', VIEW_W / 2, y + 48);
  ctx.font = '700 12px Georgia, serif';
  ctx.fillStyle = COLORS.bloodBright;
  ctx.fillText('[1]  SHATTER THE HEART', VIEW_W / 2, y + 78);
  ctx.fillStyle = '#e8b04a';
  ctx.fillText('[2]  SEAL THE SEAM', VIEW_W / 2, y + 100);
  if (game.marrowShards >= 3) {
    ctx.fillStyle = '#e8e2d0';
    ctx.fillText('[3]  SWALLOW THE FACET', VIEW_W / 2, y + 122);
  } else {
    ctx.fillStyle = 'rgba(232, 226, 208, 0.25)';
    ctx.font = 'italic 10px Georgia, serif';
    ctx.fillText(`something is missing… (${game.marrowShards}/3 marrow shards)`, VIEW_W / 2, y + 122);
  }
}

const ENDINGS: Record<string, { title: string; body: string[] }> = {
  shatter: {
    title: 'THE BROKEN VEIN',
    body: [
      'You drive the Seamsplitter into the heart, and cut.',
      'Every gem in Veinmouth goes dark at once — the lamps, the sockets,',
      'the eyes of the things that were people. The city wakes poor,',
      'and sick, and mortal. And free.',
      '',
      'Dawn, when it comes, is only dawn.',
    ],
  },
  swallow: {
    title: 'THE NEW SLEEPER',
    body: [
      'You eat the light. It does not resist. It has been waiting',
      'so long for a mouth.',
      'You curl into the seam and it closes around you like a palm —',
      'warm, patient, older than hunger.',
      '',
      'The city above will drink, and forget, and pray to something new.',
      'Let them come with their picks, someday.',
      'Let them wake what they find.',
    ],
  },
  seal: {
    title: 'THE VIGIL KEPT',
    body: [
      'You close the wound with gemwater and gold, as the Guild taught.',
      'The city drinks. The city heals. The city forgets, as it always does.',
      'The Marrowed King dreams on beneath the counting-houses.',
      '',
      'There will be another Red Vigil.',
      'There always is.',
    ],
  },
};

function drawEndingCard(ctx: CanvasRenderingContext2D, ending: string) {
  ctx.fillStyle = 'rgba(4, 2, 6, 0.96)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const e = ENDINGS[ending];
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.bloodBright;
  ctx.font = '700 26px Georgia, serif';
  ctx.fillText(e.title, VIEW_W / 2, 96);
  ctx.fillStyle = 'rgba(220, 205, 180, 0.85)';
  ctx.font = 'italic 12px Georgia, serif';
  e.body.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 140 + i * 20));
  ctx.fillStyle = 'rgba(220, 205, 180, 0.45)';
  ctx.font = '10px Georgia, serif';
  ctx.fillText('— press any key to begin a new hunt —', VIEW_W / 2, VIEW_H - 36);
}
