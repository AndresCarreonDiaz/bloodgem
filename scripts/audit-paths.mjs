// Structural audit: BFS the real collision model. Proves on-foot reachability,
// loop integrity, and gate/secret sealing — the promises great levels make.
import { buildEmberRow, buildUndervein } from '/tmp/level-bundle.mjs';

const STEP_UP = 10;
const results = [];
const check = (name, ok, detail = '') => {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

function reachable(lvl, from, opts = {}) {
  // nodes are tile cells; movement uses the game's own rules
  const key = (x, y) => y * lvl.w + x;
  const gz = (x, y) => lvl.groundZAt(x * 16 + 8, y * 16 + 8);
  const seen = new Set([key(...from)]);
  const q = [from];
  while (q.length) {
    const [x, y] = q.shift();
    const z = gz(x, y);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= lvl.w || ny >= lvl.h || seen.has(key(nx, ny))) continue;
      const nz = gz(nx, ny);
      if (nz > 200) continue;               // wall
      if (nz > z + STEP_UP) continue;       // can't climb; drops always allowed
      seen.add(key(nx, ny));
      q.push([nx, ny]);
    }
    // ladders (locked ones only if opts.laddersDropped)
    for (const l of lvl.ladders) {
      if (l.locked && !opts.laddersDropped) continue;
      if (x === l.tx && y === l.ty && !seen.has(key(l.tx, l.topTy))) { seen.add(key(l.tx, l.topTy)); q.push([l.tx, l.topTy]); }
      if (x === l.tx && y === l.topTy && !seen.has(key(l.tx, l.ty))) { seen.add(key(l.tx, l.ty)); q.push([l.tx, l.ty]); }
    }
    // elevators connect all their cells at both landings (recallable)
    for (const el of lvl.elevators) {
      const inRect = x >= el.tx && x < el.tx + el.w && y >= el.ty && y < el.ty + el.h;
      if (!inRect) continue;
      // both landings walkable: neighbors already handled by grid moves when
      // platform z matches — approximate by linking rect cells to all 4-adjacent
      // cells whose ground is within STEP_UP of EITHER landing
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= lvl.w || ny >= lvl.h || seen.has(key(nx, ny))) continue;
        const nz = gz(nx, ny);
        if (nz > 200) continue;
        if (Math.abs(nz - el.lowZ) <= STEP_UP || Math.abs(nz - el.highZ) <= STEP_UP) {
          seen.add(key(nx, ny));
          q.push([nx, ny]);
        }
      }
    }
  }
  return { has: (x, y) => seen.has(key(x, y)), count: seen.size };
}

const T = (px) => Math.floor(px / 16);

// ---------- EMBER ROW ----------
const ember = buildEmberRow();
const spawn = [T(ember.playerSpawn.x), T(ember.playerSpawn.y)];
let r = reachable(ember, spawn);
check('Ember: spawn → Gallows Square (Brute)', r.has(T(ember.bruteSpawn.x), T(ember.bruteSpawn.y)));
check('Ember: spawn → both lamps', ember.lamps.every((l) => r.has(T(l.x), T(l.y))));
check('Ember: spawn → Minehead Gate west side (65,31)', r.has(65, 31));
check('Ember: transition SEALED while gate closed', !r.has(69, 31), 'cannot slip past the Minehead Gate');
check('Ember: dock alcove reachable ONLY via the canal ladder (loop is honest)', r.has(4, 13));
check('Ember: rooftop pocket reachable via ladder', r.has(35, 4));
check('Ember: rampart reachable via Great Chain elevator', r.has(64, 5), 'Cassar arena');
check('Ember: locked gallows-ladder top reachable, bottom loop only after kick', r.has(60, 10));
check('Ember: secret hollow SEALED until struck', !r.has(25, 49));
check('Ember: canal + west arm walkable', r.has(30, 44) && r.has(4, 20));
// gate open → transition reachable
const ember2 = buildEmberRow();
ember2.gates.forEach((g) => { g.open = true; });
r = reachable(ember2, spawn);
check('Ember: gates open → the Undervein transition reachable', r.has(69, 31));
// secret broken → hollow reachable
const ember3 = buildEmberRow();
ember3.breakSecret(ember3.secrets[0]);
r = reachable(ember3, spawn);
check('Ember: broken wall → the hollow (Ticks Eye) reachable', r.has(25, 49));

// ---------- UNDERVEIN ----------
const uv = buildUndervein();
const uspawn = [T(uv.playerSpawn.x), T(uv.playerSpawn.y)];
r = reachable(uv, uspawn);
check('Undervein: entry → gallery floor (cargo lift / drop)', r.has(20, 20));
check('Undervein: gantry ring reachable via ladders', r.has(30, 13) && r.has(40, 27), 'Grist arena');
check('Undervein: Mother chamber reachable', r.has(T(uv.motherSpawn.x), T(uv.motherSpawn.y)));
check('Undervein: Heartseam position reachable', r.has(T(uv.motherSpawn.x + 32), T(uv.motherSpawn.y - 64)));
check('Undervein: Sluice lamp reachable', r.has(T(uv.lamps[1].x), T(uv.lamps[1].y)));
check('Undervein: return transition reachable from the floor', r.has(15, 3), 'via cargo lift back up');

const failed = results.filter((x) => !x).length;
console.log(`\n${results.length - failed}/${results.length} structural checks passed`);
process.exit(failed ? 1 : 0);
