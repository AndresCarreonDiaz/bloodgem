// End-to-end verification: drives the real game in headless Chromium and asserts
// the souls kit, verticality, and the two-level world (gates, elevator, transitions).
import { chromium } from 'playwright';

const OUT = process.argv[2] ?? '.';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1300, height: 760 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));

await page.goto('http://localhost:4199/');
await page.waitForTimeout(400);
await page.keyboard.press('Enter'); // title → themed
await page.waitForTimeout(400);
await page.keyboard.press('Enter'); // themed → play
await page.waitForTimeout(1200);    // let the area-title fade pass

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const box = await page.locator('#game').boundingBox();
const toPage = (s) => [box.x + (s.x / 480) * box.width, box.y + (s.y / 270) * box.height];
const clickAt = async (s, btn = 'left') => {
  const [px, py] = toPage(s);
  await page.mouse.move(px, py);
  await page.mouse.click(px, py, { button: btn });
};
// camera has aim-lean: moving the mouse shifts the view. Aim in two passes so
// the lean settles, then click on the recomputed position.
const aimAndClick = async (screenPosFn, btn = 'left') => {
  let s = await page.evaluate(screenPosFn);
  await page.mouse.move(...toPage(s));
  await page.waitForTimeout(400);
  s = await page.evaluate(screenPosFn);
  const [px, py] = toPage(s);
  await page.mouse.move(px, py);
  await page.waitForTimeout(120);
  await page.mouse.click(px, py, { button: btn });
};

// asset delivery
const audioOk = await page.evaluate(async () => {
  const res = await fetch('/audio/gate.mp3');
  return res.ok && (await res.arrayBuffer()).byteLength > 1000;
});
check('audio assets served (incl. new gate sfx)', audioOk);
const spriteOk = await page.evaluate(() =>
  performance.getEntriesByType('resource').filter((r) => r.name.includes('/sprites/')).length >= 11);
check('all 11 sprites loaded', spriteOk);

// --- combat micro-tests in a clear plaza spot (192, 544)
await page.evaluate(() => {
  const g = window.__game;
  const e = g.enemies.find((x) => x.kind === 'rabble' && !x.waypoints);
  g.player.pos = { x: 448, y: 432, z: 32 };
  e.pos = { x: 508, y: 432, z: 32 };
});
await page.waitForTimeout(800); // camera settles on the new position
await page.evaluate(() => {
  const g = window.__game;
  const e = g.enemies.find((x) => x.kind === 'rabble' && !x.waypoints);
  e.pos = { x: g.player.pos.x + 60, y: g.player.pos.y, z: g.player.pos.z };
  e.setState('windup');
  e.stateT = 0.35;
  e.freezeT = 6; // hold the wind-up open while we aim
});
const rabbleShot = () => {
  const g = window.__game;
  const e = g.enemies.find((x) => x.kind === 'rabble' && !x.waypoints);
  return g.camera.toScreen(e.pos.x, e.pos.y - e.pos.z);
};
await aimAndClick(rabbleShot, 'right');
await page.waitForTimeout(400);
let st = await page.evaluate(() => window.__game.enemies.find((x) => x.kind === 'rabble' && !x.waypoints).state);
check('gun-parry staggers a winding-up enemy', st === 'stagger', `state=${st}`);

await page.evaluate(() => {
  const g = window.__game;
  const e = g.enemies.find((x) => x.kind === 'rabble' && !x.waypoints);
  g.player.hp = 50; g.player.rally = 30; g.player.rallyT = 5;
  g.player.pos = { x: e.pos.x - 20, y: e.pos.y, z: e.pos.z };
});
await aimAndClick(rabbleShot);
await page.waitForTimeout(250);
await page.evaluate(() => {
  const e = window.__game.enemies.find((x) => x.kind === 'rabble' && !x.waypoints);
  e.freezeT = 0;
});
const visc = await page.evaluate(() => ({
  visceralT: window.__game.player.visceralT,
  hp: window.__game.player.hp,
  timeScale: window.__game.timeScale,
}));
check('visceral + max rally + slow-mo', visc.hp > 50 && visc.timeScale < 1, JSON.stringify(visc));
await page.waitForTimeout(800);

// --- quicksilver economy: shots spend, kills replenish, lamps refill
// (the earlier parry spent 1 and the visceral kill earned 1 back — net 12,
// which is the economy working; test the spend in isolation instead)
await page.evaluate(() => { window.__game.player.shards = 3; });
await clickAt(await page.evaluate(() => window.__game.camera.toScreen(window.__game.player.pos.x - 60, window.__game.player.pos.y - 32)), 'right');
await page.waitForTimeout(300);
const ammo1 = await page.evaluate(() => window.__game.player.shards);
check('parry shots spend quicksilver', ammo1 === 2, `shards=${ammo1}/3`);
await page.evaluate(() => { window.__game.player.shards = 0; });
await page.keyboard.press('KeyE'); // ensure no menu weirdness
const preShards = await page.evaluate(() => window.__game.shards?.length ?? 0);
await clickAt(await page.evaluate(() => window.__game.camera.toScreen(window.__game.player.pos.x + 40, window.__game.player.pos.y - 32)), 'right');
await page.waitForTimeout(200);
const dry = await page.evaluate(() => window.__game.shards.length);
check('empty pouch: the Shardcaster stays silent', dry === preShards, `inflight=${dry}`);
await page.evaluate(() => { window.__game.player.shards = 12; });

// --- phial
await page.evaluate(() => {
  const g = window.__game;
  g.player.pos = { x: 128, y: 160, z: 64 }; // chapel terrace, safe
  g.player.hp = 40; g.player.phials = 5;
});
await page.waitForTimeout(300);
await page.keyboard.press('KeyF');
await page.waitForTimeout(800);
const phial = await page.evaluate(() => ({ hp: window.__game.player.hp, phials: window.__game.player.phials }));
check('phial: swig heals and consumes a charge', phial.hp > 80 && phial.phials === 4, JSON.stringify(phial));

// --- lamp rest (chapel)
await page.evaluate(() => {
  const g = window.__game;
  g.enemies[0].setState('dead');
  g.player.hp = 55; g.player.phials = 1;
  const lamp = g.lvl.lamps[0];
  g.player.pos = { x: lamp.x, y: lamp.y + 10, z: g.lvl.groundZAt(lamp.x, lamp.y + 10) };
});
await page.keyboard.press('KeyE');
await page.waitForTimeout(300);
const rest = await page.evaluate(() => ({
  hp: window.__game.player.hp,
  phials: window.__game.player.phials,
  enemies: window.__game.enemies.filter((e) => e.alive).length,
}));
check('vigil lamp rest: refill + world re-wakes', rest.hp === 100 && rest.phials === 5 && rest.enemies === 12, JSON.stringify(rest));
const ammoRefill = await page.evaluate(() => window.__game.player.shards);
check('lamp rest refills the quicksilver pouch', ammoRefill === 12, `shards=${ammoRefill}`);

// --- vigil menu + Facet skill purchase
const menuOpen = await page.evaluate(() => window.__game.menuOpen);
check('resting opens the soul-gem menu', menuOpen === true);
await page.evaluate(() => { window.__game.player.gemdust = 500; });
await page.keyboard.press('Digit1'); // cut a VIGOR facet
await page.waitForTimeout(150);
const skill = await page.evaluate(() => ({
  rank: window.__game.player.skillRanks.vigor ?? 0,
  maxHp: window.__game.player.stats.maxHp,
  dust: window.__game.player.gemdust,
}));
check('facet cut: VIGOR rank applies +25 max hp', skill.rank === 1 && skill.maxHp === 125 && skill.dust === 420, JSON.stringify(skill));
const saved = await page.evaluate(() => !!localStorage.getItem('bloodgem-save'));
check('progress saved at the lamp', saved === true);
await page.keyboard.press('KeyE'); // rise
await page.waitForTimeout(150);
const menuClosed = await page.evaluate(() => !window.__game.menuOpen);
check('menu closes, hunt resumes', menuClosed === true);

// --- dash i-frames
await page.evaluate(() => { window.__game.player.pos = { x: 192, y: 544, z: 32 }; });
await page.keyboard.down('KeyA');
await page.keyboard.press('Space');
await page.waitForTimeout(80);
const inv = await page.evaluate(() => window.__game.player.invulnerable);
await page.keyboard.up('KeyA');
check('dash grants front-loaded i-frames', inv === true, `inv=${inv}`);
await page.waitForTimeout(400);

// --- drop-down: street (t1) → canal (t0)
await page.evaluate(() => { window.__game.player.pos = { x: 576, y: 632, z: 32 }; window.__game.player.airborne = false; });
await page.keyboard.down('KeyS');
await page.waitForTimeout(500);
await page.keyboard.up('KeyS');
const drop = await page.evaluate(() => ({ z: window.__game.player.pos.z, y: window.__game.player.pos.y }));
check('drop-down into the canal', drop.z === 0 && drop.y > 636, JSON.stringify(drop));

// --- stairs: chapel steps t1 → t2 (fractional z)
await page.evaluate(() => { window.__game.player.pos = { x: 184, y: 248, z: 32 }; });
await page.keyboard.down('KeyW');
await page.waitForTimeout(300);
const mid = await page.evaluate(() => window.__game.player.pos.z);
await page.waitForTimeout(700);
await page.keyboard.up('KeyW');
const top = await page.evaluate(() => window.__game.player.pos.z);
check('stairs: fractional z during ascent', mid > 34 && mid < 62, `midZ=${mid.toFixed(1)}`);
check('stairs: reached the chapel terrace (t2)', Math.abs(top - 64) < 2, `topZ=${top.toFixed(1)}`);

// --- watchman: fires from the rooftop down to the street
await page.evaluate(() => {
  const g = window.__game;
  g.player.hp = 100;
  g.player.pos = { x: 552, y: 192, z: 32 };
  const w = g.enemies.find((e) => e.kind === 'watchman' && e.pos.y < 128);
  w.setState('windup'); w.stateT = 0.5;
});
await page.waitForTimeout(1000);
const musket = await page.evaluate(() => {
  const g = window.__game;
  const w = g.enemies.find((e) => e.kind === 'watchman' && e.pos.y < 128);
  return { state: w.state, playerHp: g.player.hp, tierDelta: Math.round((w.pos.z - g.player.pos.z) / 32) };
});
check('watchman fires cross-tier', musket.state === 'recover' && musket.tierDelta >= 1, JSON.stringify(musket));

// --- priest heals a wounded mob member
const priestHeal = await page.evaluate(async () => {
  const g = window.__game;
  const priest = g.enemies.find((e) => e.kind === 'priest');
  const mob = g.enemies.find((e) => e.kind === 'rabble' && e.waypoints);
  mob.hp = 10;
  priest.pos = { x: mob.pos.x + 30, y: mob.pos.y, z: mob.pos.z };
  priest.healT = 0.05;
  g.player.pos = { x: 192, y: 544, z: 32 }; // far away so the priest doesn't flee
  await new Promise((r) => setTimeout(r, 400));
  return { hp: mob.hp };
});
check('sable priest heals its mob', priestHeal.hp > 10, `mobHp=${priestHeal.hp}`);

// --- TRICK WEAPON: Q toggles forms; the long-haft pick out-ranges the hammer
await page.evaluate(() => {
  const g = window.__game;
  const e = g.enemies.find((x) => x.kind === 'rabble' && !x.waypoints);
  g.player.pos = { x: 192, y: 544, z: 32 };
  e.pos = { x: 192 + 34, y: 544, z: 32 }; // outside hammer reach (31), inside warpick (44)
  e.hp = e.maxHp;
  e.setState('idle');
  e.freezeT = 6;
});
await page.keyboard.press('KeyQ');
await page.waitForTimeout(400);
const form = await page.evaluate(() => window.__game.player.form.style);
check('Seamsplitter transforms to long-haft pick', form === 'longpick', `style=${form}`);
await aimAndClick(() => {
  const g = window.__game;
  const e = g.enemies.find((x) => x.kind === 'rabble' && !x.waypoints);
  return g.camera.toScreen(e.pos.x, e.pos.y - e.pos.z);
});
await page.waitForTimeout(600);
const reach = await page.evaluate(() => {
  const g = window.__game;
  const e = g.enemies.find((x) => x.kind === 'rabble' && !x.waypoints);
  e.freezeT = 0;
  return { hp: e.hp, maxHp: e.maxHp };
});
check('long-haft reach connects at 34px', reach.hp < reach.maxHp, JSON.stringify(reach));
await page.keyboard.press('KeyQ'); // back to hammer
await page.waitForTimeout(350);

// --- bloodgem cache on the rooftop
await page.evaluate(() => { window.__game.player.pos = { x: 608, y: 64, z: 64 }; });
await page.waitForTimeout(250);
const gem = await page.evaluate(() => ({
  gems: window.__game.player.gems,
  dmgMult: window.__game.player.stats.dmgMult,
}));
check('bloodgem pickup: Whetstone socketed (+8% dmg)', gem.gems.includes('whetstone') && gem.dmgMult > 1.07, JSON.stringify(gem));

// --- NPC dialogue: Maud speaks, lines advance, and the world reacts to deeds
await page.evaluate(() => {
  const g = window.__game;
  const maud = g.lvl.npcs.find((n) => n.id === 'maud');
  g.player.pos = { x: maud.x, y: maud.y + 14, z: 64 };
});
await page.waitForTimeout(300);
await page.keyboard.press('KeyE');
await page.waitForTimeout(200);
const talk = await page.evaluate(() => ({
  open: !!window.__game.dialogue,
  name: window.__game.dialogue?.name,
  line: window.__game.dialogue?.lines[0],
}));
check('Maud speaks', talk.open && /MAUD/.test(talk.name ?? ''), JSON.stringify({ name: talk.name }));
await page.keyboard.press('KeyE');
await page.waitForTimeout(120);
const advanced = await page.evaluate(() => window.__game.dialogue?.idx);
check('dialogue advances', advanced === 1, `idx=${advanced}`);
// close it out
for (let i = 0; i < 6; i++) { await page.keyboard.press('KeyE'); await page.waitForTimeout(80); }
const closed = await page.evaluate(() => window.__game.dialogue === null);
check('dialogue closes', closed === true);
// reactive lines: after the brute falls, Maud speaks of the quiet chains
await page.evaluate(() => { window.__game.flags.bruteDefeated = true; });
await page.waitForTimeout(400); // menuCd from closing must expire
await page.keyboard.press('KeyE');
await page.waitForTimeout(200);
const talk2 = await page.evaluate(() => window.__game.dialogue?.lines[0] ?? '');
check('the world reacts: Maud speaks of the fallen Brute', /chains went quiet/i.test(talk2), talk2.slice(0, 40));
for (let i = 0; i < 6; i++) { await page.keyboard.press('KeyE'); await page.waitForTimeout(80); }
await page.evaluate(() => { window.__game.flags.bruteDefeated = false; }); // restore for later tests

// --- pause menu + objective tracker
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
const paused = await page.evaluate(() => ({ p: window.__game.paused, obj: window.__game.objective }));
check('Escape pauses with an objective', paused.p === true && /Gallows/.test(paused.obj), paused.obj);
await page.keyboard.press('Escape');
await page.waitForTimeout(150);
const resumed = await page.evaluate(() => !window.__game.paused);
check('Escape resumes', resumed === true);

// --- the Canal Hollow: strike the cracked wall, claim the Tick's Eye
await page.evaluate(() => {
  const g = window.__game;
  g.player.pos = { x: 25.5 * 16, y: 46.5 * 16, z: 0 };
});
await page.waitForTimeout(700);
// aim south at the cracked wall and swing
const wallShot = await page.evaluate(() => window.__game.camera.toScreen(25.5 * 16, 48 * 16 - 4));
await aimAndClick(() => window.__game.camera.toScreen(25.5 * 16, 48 * 16 - 4));
await page.waitForTimeout(500);
const secret = await page.evaluate(() => ({
  broken: window.__game.lvl.secrets[0].broken,
  ground: window.__game.lvl.groundZAt(25.5 * 16, 48 * 16 + 8),
}));
check('secret wall crumbles when struck', secret.broken && secret.ground === 0, JSON.stringify(secret));
await page.evaluate(() => { window.__game.player.pos = { x: 25.5 * 16, y: 49 * 16 + 6, z: 0 }; });
await page.waitForTimeout(300);
const tick = await page.evaluate(() => ({
  gem: window.__game.player.gems.includes('ticks-eye'),
  speed: window.__game.player.stats.speedMult,
}));
check("Tick's Eye claimed in the hollow (+10% quickness)", tick.gem && tick.speed > 1.09, JSON.stringify(tick));

// --- Dunhill's ferry: west dock → east dock along the canal
await page.evaluate(() => {
  const g = window.__game;
  const d = g.lvl.npcs.find((n) => n.id === 'dunhill');
  g.player.pos = { x: d.x + 14, y: d.y, z: 0 };
});
await page.waitForTimeout(300);
await page.keyboard.press('KeyE');
await page.waitForTimeout(200);
const ferryTalk = await page.evaluate(() => window.__game.dialogue?.name ?? 'none');
check('Dunhill greets at the west dock', /DUNHILL/.test(ferryTalk), ferryTalk);
for (let i = 0; i < 5; i++) { await page.keyboard.press('KeyE'); await page.waitForTimeout(80); }
await page.waitForTimeout(300);
const ferried = await page.evaluate(() => ({
  px: window.__game.player.pos.x,
  dunX: window.__game.lvl.npcs.find((n) => n.id === 'dunhill').x,
}));
check('the barge glides: player + ferryman at the east dock', ferried.px > 900 && ferried.dunX > 900, JSON.stringify(ferried));

// --- the West Gate loop: unlock only from the dock alcove
const gateBefore = await page.evaluate(() => window.__game.lvl.groundZAt(122, 220));
await page.evaluate(() => { window.__game.player.pos = { x: 100, y: 220, z: 32 }; });
await page.keyboard.press('KeyE');
await page.waitForTimeout(250);
const gate = await page.evaluate(() => ({
  open: window.__game.lvl.gates.find((g) => g.id === 'west-gate').open,
  groundNow: window.__game.lvl.groundZAt(122, 220),
}));
check('west gate: solid before, opens from the far side (loop clicks)', gateBefore > 200 && gate.open && gate.groundNow === 32, JSON.stringify(gate));

// --- the Tooth Broker: lucidity-gated vendor in the dock alcove
await page.evaluate(() => {
  const g = window.__game;
  g.lucidity = 3;
  g.player.gemdust = 500;
  const b = g.lvl.npcs.find((n) => n.id === 'broker');
  g.player.pos = { x: b.x, y: b.y + 14, z: 32 };
});
await page.waitForTimeout(300);
await page.keyboard.press('KeyE');
await page.waitForTimeout(200);
const brokerTalk = await page.evaluate(() => window.__game.dialogue?.name ?? 'none');
check('the Tooth Broker trades with the lucid', /BROKER/.test(brokerTalk), brokerTalk);
for (let i = 0; i < 5; i++) { await page.keyboard.press('KeyE'); await page.waitForTimeout(80); }
const bought = await page.evaluate(() => ({
  gem: window.__game.player.gems.includes('serrated-facet'),
  dust: window.__game.player.gemdust,
  rally: window.__game.player.stats.rallyRate,
}));
check('…sold: Serrated Facet for 400 dust (+15% rally)', bought.gem && bought.dust === 100 && bought.rally > 0.79, JSON.stringify(bought));

// --- the Great Chain elevator: t1 → t2 as moving ground
await page.evaluate(() => { window.__game.player.pos = { x: 1070, y: 190, z: 32 }; });
await page.keyboard.press('KeyE');
await page.waitForTimeout(1300);
const lift = await page.evaluate(() => ({
  z: window.__game.lvl.elevators[0].z,
  playerZ: window.__game.player.pos.z,
}));
check('great chain elevator carries the player up', lift.z === 64 && lift.playerZ === 64, JSON.stringify(lift));

// --- the pulled-up ladder: kick it down from the rampart top (the DS1 shortcut)
const lockedBefore = await page.evaluate(() => {
  const l = window.__game.lvl.ladders.find((x) => x.id === 'gallows-ladder');
  return l.locked === true;
});
await page.evaluate(() => { window.__game.player.pos = { x: 968, y: 168, z: 64 }; });
await page.waitForTimeout(250);
await page.keyboard.press('KeyE');
await page.waitForTimeout(250);
const kicked = await page.evaluate(() => {
  const g = window.__game;
  const l = g.lvl.ladders.find((x) => x.id === 'gallows-ladder');
  return { locked: l.locked, flagged: g.flags.laddersDropped.has('gallows-ladder') };
});
check('gallows ladder: locked until kicked from the top', lockedBefore && !kicked.locked && kicked.flagged, JSON.stringify(kicked));
await page.screenshot({ path: `${OUT}/w1-elevator.png` });

// --- brute: wake → parry slam → visceral
await page.evaluate(() => {
  const g = window.__game;
  g.player.hp = 100;
  g.player.pos = { x: g.brute.pos.x - 30, y: g.brute.pos.y, z: g.brute.pos.z };
});
await page.waitForTimeout(300);
const bossActive = await page.evaluate(() => window.__game.brute.active);
check('brute wakes when approached', bossActive === true);
await page.waitForTimeout(900); // camera settles; the brute closes in
await page.evaluate(() => {
  const g = window.__game;
  g.player.hp = 100;
  g.brute.setState('slam-windup'); g.brute.stateT = 0.5;
  g.brute.freezeT = 6; // hold the wind-up open while we aim
  g.player.pos = { x: g.brute.pos.x - 30, y: g.brute.pos.y, z: g.brute.pos.z };
});
const bruteShot = () => {
  const g = window.__game;
  return g.camera.toScreen(g.brute.pos.x, g.brute.pos.y - g.brute.pos.z);
};
await aimAndClick(bruteShot, 'right');
await page.waitForTimeout(300);
const bst = await page.evaluate(() => window.__game.brute.state);
check('gun-parry staggers the brute', bst === 'stagger', `state=${bst}`);
await aimAndClick(bruteShot);
await page.waitForTimeout(300);
await page.evaluate(() => { window.__game.brute.freezeT = 0; });
const bhp = await page.evaluate(() => ({ hp: window.__game.brute.hp, state: window.__game.brute.state }));
check('boss visceral damage', bhp.hp <= 232, `hp=${bhp.hp}/320`);
check('visceral consumes the stagger (no chaining)', bhp.state !== 'stagger', `state=${bhp.state}`);
await page.waitForTimeout(800);

// --- minehead gate auto-opens on boss defeat; transition to THE UNDERVEIN
await page.evaluate(() => {
  const g = window.__game;
  g.flags.bruteDefeated = true; // simulate the kill
  g.brute.takeDamage(9999, 0);
});
await page.waitForTimeout(300);
const mineheadOpen = await page.evaluate(() => window.__game.lvl.gates.find((g) => g.id === 'minehead-gate').open);
check('minehead gate opens when the brute falls', mineheadOpen === true);

// --- CASSAR, THE RIVAL: appears after the Brute falls; counters mashers; yields the Hollow Facet
await page.evaluate(() => { window.__game.loadLevel('ember', 'start'); });
await page.waitForTimeout(1300);
const rivalExists = await page.evaluate(() => !!window.__game.cassar);
check('the rival appears once the way is open', rivalExists === true);
await page.evaluate(() => {
  const g = window.__game;
  g.player.hp = g.player.stats.maxHp;
  g.player.pos = { x: g.cassar.pos.x - 30, y: g.cassar.pos.y, z: g.cassar.pos.z };
});
await page.waitForTimeout(400);
const duel = await page.evaluate(() => ({ active: window.__game.cassar.active, boss: window.__game.activeBoss?.name }));
check('the duel begins', duel.active === true && /CASSAR/.test(duel.boss ?? ''), JSON.stringify(duel));
// strike his counter-stance → COUNTERED
await page.evaluate(() => {
  const g = window.__game;
  g.cassar.setState('counter'); g.cassar.freezeT = 6;
  g.player.hp = g.player.stats.maxHp;
  g.player.pos = { x: g.cassar.pos.x - 24, y: g.cassar.pos.y, z: g.cassar.pos.z };
});
await aimAndClick(() => {
  const g = window.__game;
  return g.camera.toScreen(g.cassar.pos.x, g.cassar.pos.y - g.cassar.pos.z);
});
await page.waitForTimeout(400);
const countered = await page.evaluate(() => ({
  riposte: window.__game.cassar.state === 'riposte' || window.__game.cassar.state === 'strafe',
  hurt: window.__game.player.hp < window.__game.player.stats.maxHp,
}));
check('counter-stance punishes the strike (COUNTERED)', countered.riposte && countered.hurt, JSON.stringify(countered));
// finish him
await page.evaluate(() => {
  const g = window.__game;
  g.cassar.freezeT = 6; g.cassar.setState('strafe'); g.cassar.hp = 1;
  g.player.hp = g.player.stats.maxHp;
  g.player.dropLockT = 0; // shake off the riposte stagger
  g.player.pos = { x: g.cassar.pos.x - 24, y: g.cassar.pos.y, z: g.cassar.pos.z };
});
await page.waitForTimeout(300);
await aimAndClick(() => {
  const g = window.__game;
  return g.camera.toScreen(g.cassar.pos.x, g.cassar.pos.y - g.cassar.pos.z);
});
await page.waitForTimeout(400);
const rivalDown = await page.evaluate(() => ({
  dead: !window.__game.cassar.alive,
  gem: window.__game.player.gems.includes('hollow-facet'),
  visc: window.__game.player.stats.visceralMult,
}));
check('THE RIVAL YIELDS THE NIGHT: Hollow Facet taken', rivalDown.dead && rivalDown.gem && rivalDown.visc > 1.3, JSON.stringify(rivalDown));

// --- his blade is yours: [X] draws the Facet Blade; Q grows the greatsword
const blade = await page.evaluate(() => window.__game.player.ownedWeapons.includes('facetblade'));
check('the Facet Blade drops from the rival', blade === true);
await page.keyboard.press('KeyX');
await page.waitForTimeout(400);
const drawn = await page.evaluate(() => window.__game.player.form.style);
check('[X] draws the rapier', drawn === 'rapier', `style=${drawn}`);
await page.keyboard.press('KeyQ');
await page.waitForTimeout(400);
const grown = await page.evaluate(() => ({ style: window.__game.player.form.style, dmg: window.__game.player.form.dmg }));
check('Q grows the crystal greatsword', grown.style === 'greatsword' && grown.dmg === 30, JSON.stringify(grown));
await page.keyboard.press('KeyX'); // back to the Seamsplitter for later tests
await page.waitForTimeout(300);
// restore position for the transition test
await page.evaluate(() => { window.__game.player.pos = { x: 1000, y: 500, z: 32 }; });
await page.waitForTimeout(600);

await page.evaluate(() => {
  window.__game.flags.seenVista = true; // the vista pan is verified manually; keep scripted runs deterministic
  window.__game.player.pos = { x: 1112, y: 504, z: 32 };
});
await page.waitForTimeout(400);
const under = await page.evaluate(() => ({
  level: window.__game.lvl.name,
  husks: window.__game.enemies.filter((e) => e.kind === 'husk').length,
  choristers: window.__game.enemies.filter((e) => e.kind === 'chorister').length,
}));
check('transition into THE UNDERVEIN', under.level === 'undervein' && under.husks === 5 && under.choristers === 3, JSON.stringify(under));
await page.waitForTimeout(1400);
await page.screenshot({ path: `${OUT}/w2-undervein.png` });

// --- cargo lift: minehead (t2=64) straight down to the gallery floor (t0=0)
await page.evaluate(() => {
  const g = window.__game;
  const el = g.lvl.elevators[0];
  g.player.pos = { x: (el.tx + 1) * 16, y: (el.ty + 1) * 16, z: el.z };
});
await page.keyboard.press('KeyE');
await page.waitForTimeout(2000);
const lift2 = await page.evaluate(() => ({ z: window.__game.lvl.elevators[0].z, playerZ: window.__game.player.pos.z }));
check('cargo lift descends the full 64px shaft', lift2.z === 0 && lift2.playerZ === 0, JSON.stringify(lift2));

// --- recall: a raised platform can be called from the landing (no more softlocks)
await page.evaluate(() => {
  const g = window.__game;
  const el = g.lvl.elevators[0];
  el.z = el.highZ; el.target = null;                 // strand it up top
  g.player.pos = { x: 168, y: 160, z: 0 };           // stand at the low landing beside the shaft
});
await page.waitForTimeout(200);
await page.keyboard.press('KeyE');
await page.waitForTimeout(1900);
const recall = await page.evaluate(() => window.__game.lvl.elevators[0].z);
check('stranded elevator can be recalled from below', recall === 0, `z=${recall}`);

// --- FOREMAN GRIST on the Gantry: wake → parry the slam → fall → his gem drops
await page.evaluate(() => {
  const g = window.__game;
  g.player.hp = g.player.stats.maxHp;
  g.player.pos = { x: g.grist.pos.x - 40, y: g.grist.pos.y, z: g.grist.pos.z };
});
await page.waitForTimeout(400);
const gristBar = await page.evaluate(() => ({ active: window.__game.grist.active, boss: window.__game.activeBoss?.name }));
check('Foreman Grist wakes on the Gantry', gristBar.active === true && /GRIST/.test(gristBar.boss ?? ''), JSON.stringify(gristBar));
await page.evaluate(() => {
  const g = window.__game;
  g.grist.setState('slam-windup'); g.grist.stateT = 0.5; g.grist.freezeT = 6;
  g.player.pos = { x: g.grist.pos.x - 30, y: g.grist.pos.y, z: g.grist.pos.z };
});
await aimAndClick(() => {
  const g = window.__game;
  return g.camera.toScreen(g.grist.pos.x, g.grist.pos.y - g.grist.pos.z);
}, 'right');
await page.waitForTimeout(300);
const gristStagger = await page.evaluate(() => window.__game.grist.state);
check('gun-parry staggers Grist mid-slam', gristStagger === 'stagger', `state=${gristStagger}`);
await page.evaluate(() => {
  const g = window.__game;
  g.grist.hp = 1;
  g.player.pos = { x: g.grist.pos.x - 24, y: g.grist.pos.y, z: g.grist.pos.z };
});
await aimAndClick(() => {
  const g = window.__game;
  return g.camera.toScreen(g.grist.pos.x, g.grist.pos.y - g.grist.pos.z);
});
await page.waitForTimeout(400);
const gristDead = await page.evaluate(() => ({
  dead: !window.__game.grist.alive,
  gem: window.__game.player.gems.includes('foremans-grip'),
  regen: window.__game.player.stats.staminaRegen,
}));
check("Grist falls: FOREMAN'S GRIP taken (+stamina regen)", gristDead.dead && gristDead.gem && gristDead.regen > 42, JSON.stringify(gristDead));
const luc = await page.evaluate(() => window.__game.lucidity);
check('lucidity gained from the felled boss', luc >= 1, `lucidity=${luc}`);

// --- MOTHER OF FACETS: wake → phase 2 at half health → fall → the seam opens
await page.evaluate(() => {
  const g = window.__game;
  g.player.hp = g.player.stats.maxHp;
  g.player.pos = { x: g.mother.pos.x - 44, y: g.mother.pos.y, z: g.mother.pos.z };
});
await page.waitForTimeout(400);
const mActive = await page.evaluate(() => window.__game.mother.active);
check('Mother of Facets wakes', mActive === true);
await page.evaluate(() => { window.__game.mother.hp = 200; });
await page.waitForTimeout(400);
const mPhase = await page.evaluate(() => window.__game.mother.phase2);
check('phase 2: the eye opens at half health', mPhase === true);
await page.screenshot({ path: `${OUT}/m1-phase2.png` });
await page.evaluate(() => {
  const g = window.__game;
  g.mother.freezeT = 10;
  g.mother.hp = 1;
  g.enemyShots.length = 0;
  g.player.hp = g.player.stats.maxHp;
  g.player.pos = { x: g.mother.pos.x - 28, y: g.mother.pos.y, z: g.mother.pos.z };
});
await aimAndClick(() => {
  const g = window.__game;
  return g.camera.toScreen(g.mother.pos.x, g.mother.pos.y - g.mother.pos.z);
});
await page.waitForTimeout(400);
const seam = await page.evaluate(() => ({
  dead: !window.__game.mother.alive,
  flag: window.__game.flags.motherDefeated,
  heartseam: !!window.__game.heartseam,
}));
check('Mother falls: THE SEAM LIES OPEN', seam.dead && seam.flag && seam.heartseam, JSON.stringify(seam));

// --- return transition; brute stays dead (flags persist)
await page.evaluate(() => {
  const g = window.__game;
  g.player.pos = { x: 15 * 16, y: 3 * 16, z: 64 };
});
await page.waitForTimeout(400);
const back = await page.evaluate(() => ({
  level: window.__game.lvl.name,
  bruteDead: window.__game.brute?.defeated ?? false,
  westGateStillOpen: window.__game.lvl.gates.find((g) => g.id === 'west-gate').open,
}));
check('return to Ember Row: defeated boss and opened gates persist', back.level === 'ember' && back.bruteDead && back.westGateStillOpen, JSON.stringify(back));

// --- death/dust/respawn
await page.waitForTimeout(1100);
await page.evaluate(() => {
  const g = window.__game;
  g.player.gemdust = 50;
  g.player.hurtT = 0; g.player.visceralT = 0; g.player.dashT = 0; g.player.drinkT = 0;
  g.player.takeDamage(999);
});
await page.waitForTimeout(300);
const dead = await page.evaluate(() => ({ dead: window.__game.player.dead, drop: window.__game.dustDrop?.amount ?? 0 }));
check('death drops gemdust', dead.dead && dead.drop === 50, JSON.stringify(dead));
await page.waitForTimeout(1700);
const respawned = await page.evaluate(() => ({
  dead: window.__game.player.dead,
  full: window.__game.player.hp === window.__game.player.stats.maxHp,
  enemies: window.__game.enemies.filter((e) => e.alive).length,
}));
check('respawn < 2s, world reset', !respawned.dead && respawned.full && respawned.enemies === 12, JSON.stringify(respawned));

// --- THE ENDING: reach into the seam and choose (must be last — the game rests after)
await page.evaluate(() => { window.__game.loadLevel('undervein', 'from-ember'); });
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const g = window.__game;
  const h = g.heartseam;
  g.player.pos = { x: h.x, y: h.y + 8, z: 0 };
});
await page.waitForTimeout(200);
await page.keyboard.press('KeyE');
await page.waitForTimeout(250);
const choice = await page.evaluate(() => window.__game.endingChoice);
check('the Heartseam offers the choice', choice === true);
await page.screenshot({ path: `${OUT}/m2-choice.png` });
// the third door is barred without the king's bone
await page.keyboard.press('Digit3');
await page.waitForTimeout(200);
const gated = await page.evaluate(() => window.__game.ending === null && window.__game.endingChoice === true);
check('SWALLOW is gated without 3 marrow shards', gated === true);
await page.evaluate(() => {
  const g = window.__game;
  g.flags.gemsTaken.add('marrow-1'); g.flags.gemsTaken.add('marrow-2'); g.flags.gemsTaken.add('marrow-3');
});
await page.keyboard.press('Digit3'); // SWALLOW THE FACET
await page.waitForTimeout(300);
const ending = await page.evaluate(() => window.__game.ending);
check('ending chosen: THE NEW SLEEPER', ending === 'swallow', `ending=${ending}`);
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/m3-ending.png` });

// --- performance: heavy scene holds 55+ fps
await page.evaluate(() => {
  const g = window.__game;
  g.loadLevel('ember', 'start');
});
await page.waitForTimeout(1500);
await page.evaluate(() => { window.__game.player.pos = { x: 480, y: 340, z: 32 }; }); // inside the hunt mob
await page.waitForTimeout(2500);
const fps = await page.evaluate(() => new Promise((res) => {
  let frames = 0;
  const start = performance.now();
  const tick = () => {
    frames++;
    if (performance.now() - start > 1000) res(frames);
    else requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}));
check('holds 55+ fps in the hunt-mob fight', fps >= 55, `fps=${fps}`);

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
