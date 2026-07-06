// BLOODGEM — 2.5D aerial-view souls-like.
// Fixed-timestep sim (60Hz) rendered every rAF; integer-scaled pixel canvas.

import { VIEW_W, VIEW_H, COLORS } from './game/constants';
import { Game } from './game/game';
import { Input } from './engine/input';
import { render } from './game/render';
import { drawHud } from './game/hud';
import { AudioManager } from './engine/audio';
import { sprites } from './engine/sprites';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
canvas.width = VIEW_W;
canvas.height = VIEW_H;
ctx.imageSmoothingEnabled = false;

function resize() {
  const scale = Math.max(1, Math.floor(Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H)));
  canvas.style.width = `${VIEW_W * scale}px`;
  canvas.style.height = `${VIEW_H * scale}px`;
}
window.addEventListener('resize', resize);
resize();

const input = new Input(canvas, VIEW_W, VIEW_H);
let game = new Game();
// title is two-stage: first input wakes the audio (theme swells), second begins
let state: 'title' | 'title-themed' | 'play' = 'title';
let debug = false;
// deterministic hooks for the playwright verification harness
(window as unknown as { __game: Game }).__game = game;

const audio = new AudioManager();
const SOUNDS = [
  'hit_light', 'hit_heavy', 'parry', 'stagger', 'visceral', 'dash', 'shard',
  'hurt', 'enemy_die', 'pickup', 'lamp', 'death_bell', 'gate', 'elevator',
  'heal_pulse', 'amb_ember_row', 'amb_undervein', 'music_title', 'music_brute',
  'music_mother', 'music_chapel', 'transform', 'whoosh_heavy', 'chain',
  'step_stone', 'step_wood', 'braam', 'amb_whispers',
];
sprites.load([
  'grist_s', 'maud_s', 'verne_s', 'sissel_s', 'broker_s', 'dunhill_s',
  'player_n', 'player_s', 'player_e', 'player_w',
  'player_n_b', 'player_s_b', 'player_e_b', 'player_w_b',
  'player_n_c', 'player_s_c', 'player_e_c', 'player_w_c',
  'atk_s_a', 'atk_s_b', 'atk_n_a', 'atk_n_b', 'atk_e_a', 'atk_e_b', 'atk_w_a', 'atk_w_b',
  'rabble_s', 'rabble_s_b', 'watchman_s', 'hound_s', 'hound_s_b', 'brute_s', 'priest_s', 'husk_s', 'husk_s_b', 'chorister_s',
  'mother_s', 'mother2_s', 'cassar_s',
]);
sprites.load(['tex_cobble', 'tex_flagstone', 'tex_canal', 'tex_minerock', 'tex_planks', 'tex_minehead'], 'tiles/');
// painted world maps — when present, tiles/walls/faces are skipped entirely
sprites.load(['map_ember', 'map_undervein'], 'maps/');

function advanceTitle() {
  if (state === 'title') {
    state = 'title-themed';
    audio.ensureContext();
    void audio.load(SOUNDS).then(() => audio.loop('music_title', 0.45));
  } else if (state === 'title-themed') {
    state = 'play';
    audio.stopLoop('music_title', 1.2);
    audio.loop('amb_ember_row', 0.3);
    audio.play('lamp', 0.7);
  }
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Backquote') { debug = !debug; return; }
  // ending card → wipe the save, begin a fresh hunt
  if (game.ending) {
    try { localStorage.removeItem('bloodgem-save'); } catch { /* fine */ }
    location.reload();
    return;
  }
  if (game.endingChoice) {
    if (e.code === 'Digit1') game.chooseEnding('shatter');
    if (e.code === 'Digit2') game.chooseEnding('seal');
    return;
  }
  if (game.dialogue) {
    if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') game.advanceDialogue();
    return;
  }
  if (game.paused) {
    if (e.code === 'Escape' || e.code === 'KeyP') game.paused = false;
    return;
  }
  if (game.menuOpen) {
    const idx = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
    if (idx >= 0) game.buySkill(idx);
    if (e.code === 'KeyE' || e.code === 'Escape' || e.code === 'Tab') game.closeMenu();
    return;
  }
  if ((e.code === 'Escape' || e.code === 'KeyP') && state === 'play') {
    game.paused = true;
    return;
  }
  advanceTitle();
});
canvas.addEventListener('mousedown', () => advanceTitle());

const titleArt = new Image();
titleArt.src = 'title.png';

const DT = 1 / 60;
let last = performance.now() / 1000;
let acc = 0;
let fps = 60;

function frame() {
  const now = performance.now() / 1000;
  const elapsed = Math.min(0.1, now - last);
  last = now;
  fps = fps * 0.95 + (1 / Math.max(elapsed, 1e-4)) * 0.05;
  input.tick(now);

  if (state === 'play') {
    acc += elapsed;
    while (acc >= DT) {
      const aimWorld = game.camera.toWorld(input.mouse.x, input.mouse.y);
      // project the cursor onto the player's elevation plane — sprites draw at
      // worldY − z, so without this, aiming at anything on elevated ground
      // lands z pixels north of where the player is pointing
      aimWorld.y += game.player.pos.z;
      game.update(DT, input, aimWorld);
      acc -= DT;
    }
    for (const ev of game.events) {
      if (ev === 'boss_start') {
        audio.stopLoop('amb_ember_row', 1);
        audio.stopLoop('amb_undervein', 1);
        audio.play('braam', 0.9);
        audio.loop('music_brute', 0.42);
      } else if (ev === 'level_ember') {
        audio.stopLoop('amb_undervein', 1);
        audio.stopLoop('music_brute', 1);
        audio.loop('amb_ember_row', 0.3);
      } else if (ev === 'level_undervein') {
        audio.stopLoop('amb_ember_row', 1);
        audio.stopLoop('music_brute', 1);
        audio.stopLoop('music_mother', 1);
        audio.loop('amb_undervein', 0.32);
      } else if (ev === 'boss_start_mother') {
        audio.stopLoop('amb_undervein', 1);
        audio.play('braam', 1);
        audio.loop('music_mother', 0.45);
      } else if (ev === 'mother_phase2') {
        audio.play('stagger', 1); // the seam cracks
      } else if (ev === 'menu_open') {
        audio.loop('music_chapel', 0.32);
      } else if (ev === 'menu_close') {
        audio.stopLoop('music_chapel', 1.2);
      } else if (ev === 'ending') {
        audio.stopLoop('music_mother', 2);
        audio.stopLoop('amb_undervein', 2);
        audio.stopLoop('amb_ember_row', 2);
        audio.play('death_bell', 1);
      } else if (ev === 'boss_dead') {
        audio.stopLoop('music_brute', 2.5);
        audio.stopLoop('music_mother', 2.5);
        audio.loop(`amb_${game.lvl.name === 'ember' ? 'ember_row' : 'undervein'}`, 0.3);
      } else if (ev === 'slam') {
        audio.play('hit_heavy', 1);
      } else if (ev === 'lucidity_whispers') {
        audio.loop('amb_whispers', 0.16); // under everything, forever
      } else if (ev === 'menu_open_silent') {
        // dialogue open — no sound
      } else if (ev === 'step_stone' || ev === 'step_wood') {
        audio.play(ev, 0.32);
      } else {
        audio.play(ev, ev === 'death_bell' ? 1 : 0.8);
      }
    }
    game.events.length = 0;
    render(ctx, game, now);
    drawHud(ctx, game, input.mouse);
    if (debug) drawDebug();
  } else {
    drawTitle(now);
  }

  requestAnimationFrame(frame);
}

function drawTitle(t: number) {
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // the Gemcutter turnaround as illustrated backdrop — gameplay is chunky
  // pixels, menus are lavish (the Rubinite two-tier fidelity rule)
  if (titleArt.complete && titleArt.naturalWidth > 0) {
    const scale = Math.max(VIEW_W / titleArt.naturalWidth, VIEW_H / titleArt.naturalHeight);
    const w = titleArt.naturalWidth * scale, h = titleArt.naturalHeight * scale;
    ctx.globalAlpha = 0.5;
    ctx.drawImage(titleArt, (VIEW_W - w) / 2, (VIEW_H - h) / 2 - 10, w, h);
    ctx.globalAlpha = 1;
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, 'rgba(10, 7, 9, 0.4)');
    g.addColorStop(0.55, 'rgba(10, 7, 9, 0.72)');
    g.addColorStop(1, 'rgba(10, 7, 9, 0.95)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  const pulse = 0.6 + 0.4 * Math.sin(t * 1.4);
  ctx.textAlign = 'center';
  ctx.fillStyle = `rgba(158, 28, 44, ${pulse})`;
  ctx.font = '700 52px Georgia, serif';
  ctx.fillText('BLOODGEM', VIEW_W / 2, VIEW_H / 2 - 40);
  ctx.fillStyle = 'rgba(180, 165, 140, 0.6)';
  ctx.font = 'italic 13px Georgia, serif';
  ctx.fillText('The night of the Red Vigil. The Guild drills into the Heartseam at dawn.', VIEW_W / 2, VIEW_H / 2 - 10);
  ctx.font = '11px Georgia, serif';
  ctx.fillStyle = 'rgba(180, 165, 140, 0.45)';
  ctx.fillText('WASD move · mouse aim · LMB strike · RMB shardcaster (parry) · Space dash', VIEW_W / 2, VIEW_H / 2 + 26);
  ctx.fillText('climb ladders with W · strike a staggered foe to perform a VISCERAL', VIEW_W / 2, VIEW_H / 2 + 44);
  ctx.fillStyle = `rgba(240, 230, 208, ${pulse})`;
  ctx.fillText(
    state === 'title' ? '— press any key —' : '— press again to begin the hunt —',
    VIEW_W / 2, VIEW_H / 2 + 78,
  );
}

function drawDebug() {
  const p = game.player;
  ctx.textAlign = 'left';
  ctx.font = '10px monospace';
  ctx.fillStyle = '#7fff7f';
  ctx.fillText(`fps ${fps.toFixed(0)}  z ${p.pos.z.toFixed(1)}  tier ${Math.round(p.pos.z / 32)}  air ${p.airborne}  inv ${p.invulnerable}`, 14, VIEW_H - 10);
}

requestAnimationFrame(frame);
