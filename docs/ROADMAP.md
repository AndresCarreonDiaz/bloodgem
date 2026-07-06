# BLOODGEM — Build Roadmap & Iteration Log

This file is the loop's persistent state. Each /loop iteration: read this, do the
next unchecked items, log what happened, update checkboxes.

## Build order

### Phase A — Foundation
- [x] Web research launched (Bloodborne feel, Rubinite look, top-down verticality, nano-banana-2, ElevenLabs) — workflow `wf_38f689e0-ea7`
- [x] fittica-app Replicate pattern studied (`src/lib/replicate.ts` — create prediction + poll)
- [x] Both API keys validated (nano-banana-2 live; ElevenLabs payg active)
- [x] Project scaffold (Vite + TS + Canvas, boot screen)
- [x] GDD v0.1 written (docs/GDD.md)
- [x] GDD v0.2 — research folded in (Rubinite = pixel art 3/4 overhead; BB frame data; CrossCode z-model; exact API fields). Research digests: docs/research/*.md
- [x] npm install + dev server verified

### Phase B — Engine core
- [x] Fixed-timestep loop, input (WASD + mouse aim, 130ms buffer), camera follow + aim-lean + shake
- [x] Z-layer renderer: y-offset elevation, per-tier painter's pass, shadow blobs, cliff faces, stepped stairs
- [ ] Cutaway fade when player occluded by higher geometry (no occluding overhangs in graybox yet)
- [x] Heightmap collision; stairs (fractional z via ramp regions), ladders (climb, vulnerable), one-way drop-downs (walk-off + gravity)
- [x] Player: move / dash (11-frame front-loaded i-frames, cancel-on-attack, buffered) / stamina
- [x] Melee combat: arc hitboxes, asymmetric hit-stop (victim +2f), screenshake, knockback, white flash, blood decals (permanence)
- [x] Rally system (5s window, 65% conversion, visceral = max restore)
- [x] Shardcaster parry → stagger → visceral (forgiveness ladder: near-miss chips + stumbles; slow-mo 0.3× on visceral)
- [x] Enemy framework (state machine) + Gemmed Rabble (red ground-arc telegraph, white parry flash, tier leash)
- [x] Vein-hound (crouch→committed lunge, parryable) + Watchman (cross-tier musket, tracking laser-sight that locks 0.3s before firing)
- [ ] Sable Priest (mob healer)
- [x] Damage/death/Gemdust drop-and-recover (sub-2s respawn, world reset)
- [x] Vigil Lamp interactive checkpoint (E to rest: refill hp/phials, set spawn, world re-wakes)
- [x] Gemwater Phials (F/R, 5 charges, committed 0.55s swig, lamp refill)
- [x] Dynamic 2D lighting: darkness overlay + flickering lamp/player point lights
- [x] Playwright verification harness (scripts/dev-verify.mjs — 11/11 mechanics checks green)

### Phase C — Content: Ember Row
- [x] Level model: gates (locked, unlock-side, auto-on-flag), elevators (moving ground), transitions, per-level palettes, patrol waypoints
- [x] Ember Row FULL map (72×52): chapel terrace hub (t2) → chapel square (t1) → canal underlayer (t0, south band + west arm) → West Gate LOOP (canal → dock alcove → gate clicks open by the chapel) → rooftop + rampart watchman pockets → Great Chain elevator (t1↔t2) → Gallows Square (Brute) → Minehead Gate (auto-opens on boss death) → Undervein
- [x] Hunt-mob set-piece: 4-rabble torch patrol + Sable Priest healer on a street route
- [x] Sable Priest (flees player, pulses heals into the mob — priority-target lesson)
- [x] Bloodborne-style area-title cards + level transition fades
- [x] Mid-boss: The Chained Brute (slam = parryable AoE / sweep = dash-through / charge with wall-crash punish window; boss bar; boss music swap; "THE CHAIN IS BROKEN")
- [ ] Boss: Magnate Ottavo, the Gilded Beast
- [x] TRICK WEAPON: the Seamsplitter — pick-hammer ⇄ long-haft warpick (Q), distinct speed/reach/damage/stamina per form, mid-combo transform strike (×1.35, red arc flash), transform SFX; HUD form indicator
- [x] SECOND TRICK WEAPON: the Facet Blade — needle rapier ⇄ crystal greatsword (the gem grows a blade around the blade). Dropped by Cassar ("THE FACET BLADE is yours"); [X]/Tab swaps weapon sets; owned weapons persist in saves

### Phase D — Content: The Undervein
- [x] Undervein map (56×44): minehead platform (t2) w/ Winch-House lamp → cargo lift (full 64px descent) → Gantry scaffold ring (t1) w/ chorister snipers + 2 ladders → flooded galleries (t0) w/ husk miners → Heartseam antechamber (boss arena TBD) → Sluice lamp; red-crystal palette + deeper darkness + own ambience
- [x] Enemies: Husk Miner (tough melee), Facet Chorister (cross-tier crystal bolts)
- [ ] Skitterling, Broodmother, Colossus
- [x] Mid-boss: FOREMAN GRIST, HOLLOWED — fought on the narrow Gantry planks: near-full-circle cart-on-chain sweep (dash through or drop off), parryable overhead slam, chain-hook that reels the player in; drops Foreman's Grip (+45% stamina regen)
- [x] FINAL BOSS: Mother of Facets — claw (parryable) / lance volley / spike ring; phase 2 at half hp: the dreaming eye opens behind her, red vignette, hastened kit, denser rings; two-phase composition-plan theme; phase-2 sprite swap
- [x] Endings: the Heartseam choice — SHATTER (The Broken Vein) / SEAL (The Vigil Kept), full ending cards → new hunt. Swallow ending + Marrow Shards still open

### Phase E — Systems
- [x] Facet skill tree: 4 branches × 3 ranks (VIGOR/FEROCITY/GRACE/LITHOMANCY), escalating gemdust costs, soul-gem menu at lamp rest (Maud's line included)
- [x] Bloodgem perks: Leech Facet (Brute drop), Whetstone + cursed Gilded Core (world caches); stats recompute stack
- [x] Save/load (localStorage): skills, gems, gemdust, world flags, current level; saved at lamps and boss kills; wiped on ending
- [x] Chapel theme plays while the soul-gem menu is open
- [x] Lucidity: +1 per boss / the vista / each secret; pale-eye HUD counter; at 3 the whisper layer joins the ambience forever; at 5 enemies hit 5% harder (knowing costs). Persists in saves.
- [x] THE TOOTH BROKER: lucidity-gated (≥3) vendor hidden in the dock alcove behind the West Gate loop — sells the Serrated Facet (+15% rally) for 400 dust ("Walk away, or stay and pay.")
- [x] Pause menu (Esc/P): flag-driven OBJECTIVE tracker + full controls reference
- [ ] Quicksilver Shard ammo economy, trick weapons
- [x] CASSAR DUEL: optional rival fight on the east rampart (post-Brute) — fights with the player's kit (strafing, reactive quicksteps w/ i-frames, shard shots, 2-hit combo w/ parryable second swing) + COUNTER-STANCE that staggers mashers; drops the cursed Hollow Facet (+35% visceral, −20% phial)
- [x] NPC dialogue: Maud (chapel), Provost Verne (Minehead Gate), Sissel (lamplighter girl) — full dialogue system with paged lines, [E] prompts, and FLAG-REACTIVE scripts (lines change after each boss falls; Verne argues for the Seal ending; Sissel delivers the 'it was enough' beat)
- [x] Dunhill the ferryman: canal fast travel, west dock ↔ east dock — the barge glides, the ferryman moves with you; post-Mother he notes the water has gone still

### Phase F — Assets
- [x] Style anchor image via nano-banana-2 (assets/sprites/anchor_gemcutter.png — turnaround sheet, stunning; also future title/menu art)
- [x] Player sprite 4-dir idle (16×26 in-game, chroma-keyed, anchored identity via image_input)
- [x] Rabble sprite (S-facing, used for all dirs for now)
- [x] Environment props (procedural): graves, lamp posts, market stalls, crates/barrels, minecarts, support beams, glowing crystal clusters — ~37 placed across both levels
- [x] Procedural walk bob (sprite frames deferred)
- [ ] Sprite walk/attack frames; directional enemy sprites; tilesets; UI icons
- [x] Sprite pipeline: scripts/gen-image.mjs (green-screen chroma-key via sharp HSV) + scripts/prep-sprites.mjs (trim + nearest downscale → public/sprites)
- [x] SFX batch ×12 + Ember Row ambience loop + title music (assets/audio, copied to public/audio) — scripts/gen-audio.mjs (max 3 concurrent, ElevenLabs cap is 4)
- [ ] Boss themes ×2 via composition plans; Undervein ambience; chapel theme
- [x] Audio integrated: AudioManager (Web Audio), game event queue → SFX on every combat beat; ambience loop in play; title theme on first input (two-stage title for autoplay policy)
- [x] Sprites integrated with tofu fallback + white-flash tinting

### Phase G — Polish
- [x] STRUCTURAL LEVEL AUDIT (scripts/audit-paths.mjs): BFS over the real collision model — 18/18 checks prove on-foot reachability of every POI, honest loop gating (alcove only via canal; transition sealed until the gate opens; hollow sealed until struck), and elevator/ladder connectivity
- [ ] Title screen, death screen ("YOU CRUMBLED"?), boss health bars, lamp menu
- [ ] Balance pass against GDD §14 feeling-checklist
- [ ] Full playthrough verify, bugfix, ship

## Iteration log

### Iterations 18-25 — 2026-07-05/06 — THE BOARD ERA (condensed)
- Repo pushed to github.com/AndresCarreonDiaz/bloodgem; GitHub Issues became
  the task board (pinned #1 = onboarding; docs/AGENTS.md = house rules).
- Deployed to GitHub Pages (auto on push): andrescarreondiaz.github.io/bloodgem
- ART: owner rejected tiles, then pixel top-down ("cheap"). Final direction:
  PAINTERLY DIABLO-STYLE 3/4 (layout-conditioned painted worlds via
  scripts/gen-worldart.mjs; painting adopted into collision where they
  disagreed), full painterly character set (player 20 frames + enemies +
  strides + E/W mirror + bosses + NPCs), camera 480×270, REPLACED-style
  cinematic post (GPU bloom, film grain, ground-glow, volumetric rays).
  True-3D rewrite assessed and DECLINED. 121 fps held.
- CONTENT: cutaway fade (#7), third ending SWALLOW THE FACET + 3 Marrow
  Shards (#4), quicksilver ammo economy 12-pouch/-1 shot/+1 kill (#5).
- Suites grew to 66 gameplay + 18 structural; verify scale factors follow
  VIEW 480×270.
- OPEN: #2 Gilded Beast, #3 Undervein variants, #8 owner playtest verdict.

### Iteration 17 — 2026-07-05
- DUNHILL, THE FERRYMAN: the last named NPC from the GDD. Canal fast travel
  (west dock ↔ east dock) as a dialogue-close ride with fade + camera snap;
  he ferries WITH you, so the return trip is always there. Reactive line after
  the Mother falls ("the canal approves").
- With this, every named character, boss, weapon, system, and secret from
  docs/GDD.md is shipped. 62/62 gameplay + 18/18 structural checks green.

### Iteration 16 — 2026-07-05
- STRUCTURAL AUDIT: new scripts/audit-paths.mjs BFS-walks both levels using
  the game's own movement rules (step-up, drops, ramps, ladders, elevators,
  gate states). 18/18 — every arena/lamp/secret reachable on foot, all seals
  and loops provably honest. The "best levels" promises are now machine-checked
  alongside the 60-check gameplay suite.

### Iteration 15 — 2026-07-05
- Pause menu with the night's OBJECTIVE (flag-driven wayfinding for returning
  players) + controls reference. THE TOOTH BROKER shipped: double-gated behind
  the canal loop AND Lucidity 3; his one deal executes when his pitch ends —
  Serrated Facet, 400 dust, +15% rally recovery. New rallyRate stat line.
- 60/60 checks green.

### Iteration 14 — 2026-07-05
- THE FACET BLADE: second trick weapon, taken from Cassar's dead hand.
  Weapon-SET system ([X] swaps sets, Q still transforms within a set):
  rapier = fastest poke in the game (0.32s cycle, narrow thrust arc);
  greatsword = 30 dmg crystal arc with red glow render. Persists in saves.
- 56/56 checks green.

### Iteration 13 — 2026-07-05
- LUCIDITY shipped (insight-lite): gained from bosses, the vista, secrets;
  whispers join the mix at 3 ("the city starts talking back"); +5% enemy
  damage at 5. Boss-intro BRAAM stingers on all boss starts.
- Perf audit added to the suite: 121 fps in the hunt-mob fight (floor: 55).
- 53/53 checks green. TTK math audited: mobs 2-6 hits, bosses 45-90s — souls-
  appropriate across the board; no balance changes needed.

### Iteration 12 — 2026-07-05
- THE WORLD SPEAKS: dialogue system + three NPCs with sprites (Maud seated at
  her stool, gaunt gilded Verne, tiny Sissel with her lamplighter pole).
  Scripts are world-state-reactive — the city acknowledges your deeds, and
  Verne quietly lobbies for the Seal ending ("Dawn needs its lie").
- 51/51 checks green (speak / advance / close / reactive-lines verified).

### Iteration 11 — 2026-07-05
- CASSAR, THE RIVAL shipped: the hunter-duel. Duelist AI (circle-strafe,
  reactive dodge when you wind up close, ranged shard shots, two-hit combo
  with the second swing parryable) and the counter-stance teaching moment:
  his pistol glints raised — strike it and YOU get countered and staggered.
  Appears on the east rampart only after the Brute falls; drops Hollow Facet.
- Heartseam chamber dressed with a crystal crown; visceralMult/phialMult stats.
- 47/47 checks green (rival gating, duel start, counter punish, gem drop).

### Iteration 10 — 2026-07-05
- Illustrated TITLE SCREEN from the Gemcutter anchor art (Rubinite two-tier
  fidelity: chunky pixels in play, lavish illustration in menus).
- SECRET: the Canal Hollow — a crack-signposted breakable wall in the canal;
  strike it ("THE WALL CRUMBLES") to claim the Tick's Eye gem (+10% quickness).
  New speedMult stat; secretsBroken persists in saves.
- Feel: enemies bob while moving; warpick swings finally use the heavy whoosh.
- 43/43 checks green (secret wall + gem claim verified end-to-end).
- Next: manual balance playthrough, 6-frame walk cycles, boss arena dressing,
  Cassar duel / Lucidity, second trick weapon.

### Iteration 9 — 2026-07-05 — REVIEW FIXES + GREAT-LEVEL PRINCIPLES
- ADVERSARIAL REVIEW (18 agents): 13 confirmed findings, ALL FIXED —
  chained-visceral exploit (stagger now consumed), strandable elevators
  (recall-from-landing + reset on world-wake), chorister telegraphs (sniper
  branch by isSniper), elevator paint order, lamp rest vs maxHp, phase-2 parry
  flash haste, Grist shard-wake, input consume ordering ×2, hook i-frame
  respect, transition momentum reset, enemies ride elevators, minehead gate
  flank walls sealed (could walk around it).
- GREAT-LEVELS RESEARCH APPLIED: kicked-down ladder shortcut over Gallows
  Square (locked until dropped from the rampart top — the DS1 loop-click),
  first-descent vista pan toward the Heartseam glow, teach-pair encounter at
  the chapel stairs + stall-ambush hound (teach/test/twist), gallows tableau
  with blood trail to the canal (environmental storytelling), Gallows Square
  flagstone material override (district identity). Research digests:
  docs/research/great-levels.md, pixel-beauty.md.
- PIXEL-BEAUTY STACK: per-area color grade + always-on soft vignette, godrays,
  typed decal layer (moss/crack/rubble/blood, seeded per level).
- 41/41 checks green (3 new: ladder kick, elevator recall, stagger consume).
- Next: manual playthrough balance, walk-cycle frame count up (6-frame),
  boss arena dressing, more secrets (illusory-wall equivalent?), NPC voices?,
  ending polish.

### Iteration 8 — 2026-07-05 — THE "NOT CHEAP" MANDATE
- User direction: must LOOK and FEEL amazing; levels must follow the all-time
  greats. This iteration: visual overhaul. Next: level redesign from research.
- SHIPPED: real pixel-art floor textures for all 6 surfaces (nano-banana-2,
  16 hashed variants/material to break grid repetition), contact-shadow AO
  under every cliff/wall edge, canal water shimmer bands, ambient particle
  field (rising embers in Ember Row / sinking red spores in the Undervein),
  warm additive glow pass (amber gaslight, red gem-light), player 2-frame walk
  cycle (AI stride frames anchored on existing sprites), footstep SFX
  (stone/wood by surface), dash dust, README.md.
- 38/38 checks still green after the overhaul.
- IN FLIGHT (background workflows, apply next wake): adversarial code review
  (4 dimensions + skeptic verification); research on great-level principles
  (Dark Souls interconnection, vistas, pacing, secrets) + pixel-art environment
  techniques → drives the level redesign pass.

### Iteration 7 — 2026-07-05
- TRICK WEAPON shipped: Seamsplitter two-form system with transform strikes —
  weapon-form snapshot stored per swing so combos mix forms correctly.
- FOREMAN GRIST shipped on the Gantry (verticality boss arena: narrow planks,
  drop-offs, ladder runback). Hook-pull is a new threat type.
- World dressed with ~37 procedural props; walk bob; heavier screenshake on
  warpick hits.
- 38/38 checks green (transform reach proof: hammer whiffs at 34px, warpick
  connects; Grist wake/parry/gem verified; whole prior suite intact).
- Next (iteration 8): balance playthrough vs GDD §14 feel checklist, Lucidity
  or Cassar duel, sprite animation frames, second trick weapon, README + itch
  packaging?, code-review pass.

### Iteration 6 — 2026-07-05
- THE GAME IS COMPLETABLE: title → Ember Row → Brute → Undervein → Mother of
  Facets (2 phases, eye reveal) → Heartseam → ending choice → ending card →
  new hunt. Two endings shipped.
- Systems: Facet skill tree + soul-gem menu at lamps (chapel theme plays),
  bloodgem perks (incl. cursed Gilded Core), localStorage save/load,
  generalized boss bars, player stat block (dmg/iframes/lifesteal/dust mults).
- Bugs found by harness: (1) closing the vigil menu with E re-buffered an
  interact press and instantly re-opened it (fixed with menu-close cooldown);
  (2) duplicate boss_dead audio branch left Mother's theme playing.
- 33/33 checks green including the full two-boss, two-level, ending-to-ending
  playthrough. Screenshots: phase-2 red reveal, choice panel, ending card.
- Next (iteration 7): Foreman Grist mid-boss, trick weapon (Seamsplitter
  transform), walk/attack sprite animation frames, environment props/tileset
  art pass, Cassar duel or Lucidity, balance playthrough.

### Iteration 5 — 2026-07-05
- BOTH LEVELS EXIST AND CONNECT. Ember Row rebuilt as a real multi-loop level
  (72×52): chapel hub, canal underlayer, West Gate shortcut loop (unlocks only
  from the dock-alcove side — the Bloodborne loop-click), hunt-mob patrol with
  Sable Priest healer, rooftop/rampart snipers, Great Chain elevator, Gallows
  Square, Minehead Gate → THE UNDERVEIN (56×44: minehead → cargo lift 64px
  descent → gantry ring with choristers → flooded galleries with husks).
- New systems: gates (manual unlock-side + auto-on-boss-flag), elevators as
  moving ground, level transitions with area-title cards + fades, per-level
  palettes/darkness/ambience, patrol waypoints, priest heal pulses, persistent
  world flags (boss death + opened gates survive level swaps and deaths).
- New assets: priest/husk/chorister sprites, gate/elevator/heal SFX, Undervein
  ambience loop, chapel safe-room theme (banked, not yet wired).
- REAL BUG FOUND AND FIXED by the harness: screen→world aim ignored elevation —
  clicking a sprite on elevated ground aimed z px north of it (shards whiffed
  everything on t1/t2). Old graybox plaza was t0, masking it. Fix: project the
  cursor onto the player's elevation plane in main.ts. Also: sniper muzzles
  raised +26px so parapet-edge shots clear their own roofline.
- 23/23 verification checks green (full two-level traversal: gate loop,
  both elevators, both transitions, flag persistence, priest, all combat).
- Next (iteration 6): Undervein bosses (Foreman Grist mid, Mother of Facets
  final w/ 2 phases + eye reveal + composition-plan boss theme), endings,
  Facet skill tree + bloodgem perks UI, walk animations, environment props,
  chapel music wiring, Lucidity.

### Iteration 4 — 2026-07-05
- NEW SYSTEMS: Gemwater Phials (committed swig, lamp refill), Vigil Lamp rest
  (checkpoint + world re-wake, "VIGIL KEPT"), enemy variety (multi-kind Enemy:
  rabble / hound with parryable crouch→lunge / watchman with cross-tier 3D-aimed
  musket + tracking-then-locking laser sight), and THE CHAINED BRUTE mid-boss
  (dormant→trigger, slam/sweep/charge kit, gun-parry the slam → stagger →
  boss visceral 90dmg, boss bar + battle music swap, corpse persists).
- Assets: watchman/hound/brute sprites (style-matched via rabble reference
  image), 90s boss battle track. All wired.
- Two real bugs found by the harness: (1) phial input consumed-then-discarded
  mid-swing — consume() must be the LAST condition in the chain; (2) boss
  visceral range didn't scale with target radius.
- 18/18 verification checks green. Screenshot: boss bar + visceral on brute +
  phial pips + hound/watchman in frame.
- Next (iteration 5): expand the map into the REAL Ember Row (bigger multi-loop
  layout w/ canal z0 + locked-gate loopback + elevator shortcut), hunt-mob
  set-piece, Sable Priest, tilesets/environment art pass, walk animations,
  Undervein (level 2) graybox start, chapel safe-room music.

### Iteration 3 — 2026-07-05
- BOTH ASSET PIPELINES LIVE (front-loaded because the API keys are temporary).
- ElevenLabs: 12 SFX + gapless Ember Row ambience loop + 70s gothic title theme.
  Hit their 4-concurrent-request cap on first run; script now chunks by 3.
- nano-banana-2: Gemcutter turnaround anchor (excellent — hooded hunter-surgeon,
  brass warpick, glowing red chest gem, only saturated color), then 4-dir player
  sprites + rabble sprite conditioned on the anchor. Chroma-key works (83% px
  transparent); Read-tool previews still SHOW green because RGB is retained
  under alpha=0 — check alpha programmatically, don't trust the preview.
- Engine: AudioManager + SpriteStore, game event queue → SFX on every beat,
  two-stage title (input 1 = theme swells, input 2 = hunt begins + ambience),
  sprite rendering with feet anchoring, white-flash tint, tofu fallback.
- Verification green: 13/13 (11 mechanics + audio served + sprites loaded).
  In-game screenshot confirms sprites read beautifully in lamplight.
- Next (iteration 4): Gemwater Phials (healing — core souls mechanic, still
  missing!), Vigil Lamp interaction (rest/refill/respawn), Watchman (cross-tier
  sniper) + Vein-hound + their sprites, Chained Brute mid-boss ("tofu" fight
  first), boss theme via composition plan. Then full Ember Row map expansion.

### Iteration 1 — 2026-07-05
- Found existing `Bloddgem/` = empty GameMaker stub (default Room1 only). Left
  untouched; building web version at repo root instead (buildable/verifiable
  autonomously).
- Launched 5-agent research workflow (background).
- Studied fittica-app: `runNanoBanana()` = POST /v1/predictions + 1s poll loop.
- Verified `google/nano-banana-2` on Replicate (inputs: prompt, image_input[],
  aspect_ratio, resolution 1K/2K/4K, output_format png). Verified ElevenLabs key
  (payg, active).
- Scaffolded Vite+TS project, boot screen, gen-script helpers
  (scripts/lib/replicate.mjs, scripts/lib/elevenlabs.mjs).
- Wrote GDD v0.1: Veinmouth, the Marrowed King, 2 levels × 3 z-layers with loop
  diagrams, 14 enemies + 4 bosses + optional duel, 4 trick weapons, rally/parry/
  dash combat, Facet skill tree, Bloodgem perks, Lucidity.
- Next: fold research into GDD v0.2, npm install, start engine core.

### Iteration 2 — 2026-07-05
- Research landed (5/5 agents, 81 findings): Rubinite = Cup Dog Games pixel-art
  boss-rush, 3/4 overhead, scarlet-on-darkness, dynamic flicker lights, tofu-man
  prototyping process; BB frame data (11 i-frame quickstep, 5s rally, insight
  thresholds); CrossCode z-height model; nano-banana-2 full schema ($0.067/img,
  no native alpha → green-screen chroma-key recipe, image_input identity lock);
  ElevenLabs exact endpoints (SFX loop:true gapless, music_v2 composition plans,
  copyright guardrails). Digests in docs/research/.
- GDD → v0.2; pipeline scripts updated to confirmed API contracts.
- ENGINE CORE BUILT (Phase B ~80%): 13 modules, ~1400 lines. Graybox Ember Row
  slice: plaza (t0) → twin stairways → street/courtyard (t1) → ladder + drop
  gaps → rampart (t2). Full souls kit playable with tofu-man placeholders.
- Fixed real bug found by verification: visceral input was consumed by the
  normal swing path before resolveVisceral ran (reordered in Game.update).
- Verified end-to-end in headless Chromium: 11/11 checks (parry→stagger→
  visceral+slow-mo+max-rally, rally on hits, dash i-frames, drop-down, stairs
  fractional z, death→dust drop→sub-2s respawn). Visual screenshots confirmed
  title, lighting, telegraphs, float texts, decals.
- Next (iteration 3): expand graybox toward full Ember Row loop design (canal
  z0? or keep 3 tiers as designed), Watchman with cross-tier sniping +
  Vein-hound + hunt-mob set-piece, Vigil Lamp interaction, Chained Brute
  mid-boss prototype; then style-anchor sprite via nano-banana-2 + first
  ElevenLabs audio batch (ambience bed + hit/parry/dash SFX).
