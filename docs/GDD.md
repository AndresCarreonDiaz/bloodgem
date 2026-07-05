# BLOODGEM — Game Design Document

**v0.2 — 2026-07-05** (research folded in — see `docs/research/*.md` for sources; remaining `[tune]` = confirm by playtest)

---

## 1. High Concept

A **2.5D aerial-view action RPG in the spirit of Bloodborne**: fast, aggressive souls
combat in a gaslit mining city consumed in a single night by a crimson catastrophe.
Rendered in the style of *Rubinite* (Cup Dog Games, 2026): 3/4 overhead pixel art,
scarlet-on-darkness palette, dynamic flickering point lights — with **true vertical
level design** — rooftops, ramparts, canals, shafts, ladders and elevators — never a
flat plane.

Market note from research: the closest existing game, *Morbid: The Seven Acolytes*,
was praised for its Bloodborne aesthetic but criticized for "pretty simplified"
combat. The niche of a mechanically deep top-down Bloodborne is **open** — Bloodgem's
edge is depth: rally + gun-parry + real verticality.

You are a **Gemcutter**, a surgeon-warrior who sockets crystallized god-blood into flesh
and steel. Tonight the blood wakes.

---

## 2. Design Pillars

1. **Aggression is survival.** No shields. Lost health can be *rallied* back by striking
   back fast. The dash is a quickstep, not a roll. The parry is a gunshot.
2. **Dread becomes mastery.** The world starts oppressive and illegible; through
   shortcuts, lamp routes and enemy knowledge it becomes *yours*. Death teaches.
3. **The world is the puzzle.** Levels loop over themselves in Z as well as X/Y.
   The moment a gate unlocks back to a lamp *is* the reward.
4. **Elegant brutality.** Hit-stop, screenshake, blood and gem shards. Every hit —
   given or taken — must be felt.
5. **Cosmic rot beneath gothic stone.** The story escalates from "plague night" to
   "we mined the heart of a sleeping god." Horror of the flesh first, horror of
   scale second.

---

## 3. Story & World

### The City of Veinmouth

Generations ago the miners of Veinmouth struck **the Lode** — a vein of *bloodgems*,
crystals warm as flesh that glow like embers. Gem-light knit wounds and cured the
coughing plague; the city grew obscenely rich selling **gemwater** cures. The
**Lapidarist Guild** rose above church and crown, learning to cut facets into gems —
and to socket them into flesh and steel. Gem-blessed laborers worked triple shifts.
Gem-socketed soldiers never tired. The city drank.

But the Lode is not ore. It is the **crystallizing heart-blood of the Marrowed King**,
a god buried before the world had a name, dreaming as it slowly turns to stone.
Every gem cut is a wound. Every socket is a door.

Tonight — the **Night of the Red Vigil**, when the Guild's great drill finally bores
into the **Heartseam** itself — the god's blood wakes inside everyone who carries it.
Flesh blooms into garnet. Men become beasts with crystal growing through their pelts.
The vigil lamps are lit, the gates are sealed, and the Guild's bells ring a hunt.

### You

An outland Gemcutter, contracted by the Guild and paid in the only currency that
matters: **a socket of your own**. The game opens on the surgery slab (Bloodborne's
transfusion homage) — the Provost's voice: *"A little gem-light, and you'll wake to
a city that needs cutting."* You wake. The city is screaming.

### Goal & Endings

Fight down through the burning district and descend the mine to the Heartseam. There:

- **SHATTER** — destroy the heart. The god dies; every gem in the city goes dark;
  Veinmouth starves but is *free*. (Default ending.)
- **SEAL** — close the seam and relight the vigil. The cycle holds for another
  generation. (Take Provost Verne's offer.)
- **SWALLOW THE FACET** — consume the three hidden **Marrow Shards** first, then eat
  the Facet at the heart. You curl into the seam and begin to dream. A new sleeper.
  (Secret ending — Bloodborne's Moon Presence homage.)

### Key NPCs

| NPC | Role | Analog |
|---|---|---|
| **Provost Malachai Verne** | Head of the Lapidarist Guild; silky, guilty, wants the seam *sealed* | Healing Church leadership |
| **Maud, the Blind Polisher** | Hub keeper at the Vigil Chapel; cuts facets into your soul-gem (level-up) | The Doll |
| **Sissel the Lamplighter** | A child relighting vigil lamps along dangerous routes; escort-adjacent side quest; her survival gates an ending detail | Yharnam survivors |
| **Ferryman Dunhill** | Poles a corpse-barge along the canal; fast travel between unlocked docks; increasingly *wrong* as the night deepens | Gatekeepers |
| **Cassar, the Rival Gemcutter** | Met twice as NPC, fought once as optional duel boss; teaches (by killing you) that parry beats greed | Hunter NPC fights |

### Tone rules for all writing

- Item descriptions carry the lore load; dialogue is scarce and oblique.
- Never say "god" in Act 1. Escalate vocabulary: *the Lode → the Sleeper → the
  Marrowed King*.
- Everything beautiful is paid for. Every cure has a bill.

---

## 4. The Two Levels

Both levels are **multi-Z structures** — three height layers each, connected by
stairs, ladders, drop-downs, and elevators, looping back on themselves with
unlockable shortcuts. No flat fields, ever.

### Level 1 — EMBER ROW (surface district)

*Central Yharnam analog. The teaching level. Cobblestone, gaslight, canal fog,
mobs with torches.*

**Height layers**

- **Z2 — Ramparts & rooftops:** watchman snipers, beam-walks, drop-down ambush
  routes, the bell tower.
- **Z1 — Streets:** plazas, stair-streets, the hunt mob, gallows square, the Vigil
  Chapel hub.
- **Z0 — Canal & cellars:** flooded undercroft, vein-hounds in the dark, the
  corpse-barge dock, ladder shortcuts back up.

**Spine / loops** (Bloodborne loop design, explicitly)

1. **Vigil Chapel (LAMP)** → descend stair-street into Gallows Square → mid-boss
   **The Chained Brute** → cellar door → Z0 canal → ladder up into tenement court →
   **unlock gate back into Chapel square** (loop 1 clicks).
2. Chapel → rooftops via bell tower ladder (Z2) → beam-walk over the hunt mob
   (they can't reach you; watchmen can) → drop-down (one-way) into the Counting
   House courtyard → **Great Chain elevator unlocked** → rides back up to Chapel level
   (loop 2 clicks).
3. Counting House → the Ember Bridge → **BOSS: Magnate Ottavo, the Gilded Beast** →
   the Minehead Gate opens → Level 2.

**Landmarks:** Vigil Chapel (hub lamp, Maud), Gallows Square, the Counting House,
the Ember Bridge (boss arena with collapsing braziers), the Great Chain (elevator
to the minehead).

**Set-piece:** the hunt mob — a torch-and-pitchfork procession that patrols a street
loop on Z1. Fighting it head-on is death at level 1; the level teaches you to go
*over* (Z2) or *under* (Z0) it — verticality as the answer.

### Level 2 — THE UNDERVEIN (the mine)

*Descent. Gas lamps give way to red crystal bioluminescence. Wood scaffolding over
black drops. The god gets louder.*

**Height layers**

- **Z2 — Minehead & winch-houses:** surface works, the Great Chain terminus,
  foreman's office (lore cache).
- **Z1 — The Gantry:** a shanty-town of scaffolds bolted to the cavern wall;
  rope-bridges, ladder networks, collapsing planks (one-way drops), the Facet
  Choir chanting on platforms you can hear before you see.
- **Z0 — Flooded galleries & the Heartseam approach:** waist-deep gemwater
  (slows dash `[tune]`), crystal-fused husks that ambush from the walls, the
  drill, the seam.

**Spine / loops**

1. Minehead **(LAMP: The Winch-House)** → descend ladders into the Gantry →
   mid-boss **Foreman Grist, Hollowed** on the central platform → his winch
   key starts the **cargo lift**: shortcut Z1↔Z2 (loop 1).
2. Gantry lower ladders → Z0 galleries → wade past the drill → find the
   **Drainage Sluice** lever → drains the far gallery AND opens a chute back to
   the Gantry (loop 2) → **LAMP: The Sluice**.
3. Drained gallery → the Heartseam antechamber → **FINAL BOSS: Mother of Facets**
   → the seam → ending choice.

**Set-piece:** the descent itself — the game's camera pulls slightly wider as you
go down `[tune]`, the music layer thins to heartbeat + crystal chimes, and vigil
lamps get rarer. Verticality as dread.

---

## 5. Bestiary

### Level 1 — Ember Row

| Enemy | Design | Behavior |
|---|---|---|
| **Gemmed Rabble** | townsfolk, garnet buboes, farm tools & torches | mob logic: brave in groups, cowardly alone; the basic parry dummy |
| **Watchman** | musket + greatcoat, posted on Z2 | snipes across height layers; laser-sight telegraph line before each shot; forces vertical thinking |
| **Vein-hound** | flayed dog, crystal spine | fast lunges, circles; teaches dash timing |
| **Ticker** | fist-sized gem parasite | swarms, latches (mash to shake); nests in corpses that look like loot |
| **Sable Priest** | tall, censer of gem-smoke | *heals/frenzies the mob* — teaches target priority |
| **The Chained Brute** *(mid-boss, recurs as elite)* | quarry hauler, snapped chains, wrecking-ball fists | slow readable swings, arena has pillars at two heights |
| **BOSS: Magnate Ottavo, the Gilded Beast** | the mine baron mid-transformation, gold chains embedded in beast flesh, one arm crystallized into a garnet club | Cleric Beast homage: leaping, wall-clambering (arena edges = Z2 perches he pounces from), phase 2 sets his gold on fire |

### Level 2 — The Undervein

| Enemy | Design | Behavior |
|---|---|---|
| **Husk Miner** | corpse fused with pick & wall-crystal | armored front, slow, breaks guard — get behind (backstab tutorial for viscerals) |
| **Facet Chorister** | robed, kneeling, voice like ringing glass | ranged crystal bolts arcing between Z-layers; keeps chanting even while you kill it |
| **Gem-tick Broodmother** | bloated ticker queen | spawns tickers until popped; blocks a shortcut chute |
| **Skitterling** | knuckle-sized crystal spiders | floor-carpet swarm; AoE tools shine |
| **Crystal Colossus** *(elite)* | mining golem grown wrong | arena-quake slam that must be *dashed through*, not away from `[tune]` |
| **Foreman Grist, Hollowed** *(mid-boss)* | the foreman, hollowed and refilled with gem-light, swings a coupled minecart on a chain | platform fight on the Gantry; his slams break planks — the arena loses floor as the fight goes on |
| **BOSS: Mother of Facets** | the first miners' bodies grown into one crystal amalgam; a dozen mouths, one voice | Phase 1: crystal amalgam melee. Phase 2: the wall behind her cracks — the **dreaming eye of the Marrowed King** opens in the seam; the arena floods with red light, she is puppeted faster; the *eye itself* telegraphs some attacks |
| **OPTIONAL: Cassar** | rival gemcutter duel, Ember Row belfry | human duel, gun-parries *you*; the parry final exam |

---

## 6. Weapons — Trick Weapons

Every main weapon has two forms, toggled mid-combo (Bloodborne's signature).
`[tune]` all damage numbers at implementation.

1. **Seamsplitter** *(starter)* — one-hand pick-hammer ⇄ long-haft warpick.
   Fast close swings ⇄ sweeping reach. Saw Cleaver analog.
2. **Facet Blade** — rapier ⇄ crystal greatsword (the gem grows a blade around the
   blade). Precise pokes ⇄ slow heavy arcs with gem-shard burst on charged heavy.
3. **Chainspike** — dagger ⇄ chain-whip on a winch reel. Threaded Cane analog;
   whip form can hit enemies one Z-layer up/down at range `[tune]`.
4. **Vigil Lantern-Mace** — mace ⇄ burning flail. Fire damage, brightens the
   fog-of-war radius while drawn; certain hidden things flinch from it.

**Off-hand:**

- **Shardcaster** — gem-shard pistol. **This is the parry button.** Consumes
  Quicksilver Shards.
- **Blasting Cord** — miner's charge, thrown AoE; clears skitterling carpets.
- **Lure Bell** — rings; pulls enemies to a point (stealth/mob-splitting tool).

---

## 7. Core Combat Mechanics

The Bloodborne kit, tuned for aerial view. Values below are research-anchored
starting points (Bloodborne frame data, Hades/Eldest Souls/Unsighted patterns);
`[tune]` = confirm by playtest.

- **Stamina** — attacks and dashes spend it; regenerates when not acting.
  Never fully gates walking.
- **Dash (quickstep)** — total ~0.35s; **i-frames front-loaded: frames 1–11
  (~0.18s)** (Bloodborne's quickstep is exactly 11 i-frames / 18-frame recovery),
  vulnerable recovery tail. **I-frames cancel the instant an attack is buffered
  out of the dash** (Hades' rule — keeps aggression risky). One dash consumed
  per press (no input oversampling — Death's Door's documented flaw). Input
  buffer **~130ms**. Slight afterimage. No roll. *Never ship without dash
  i-frames — Hyper Light Drifter had to patch them in post-launch.*
- **Rally / Regain** — on taking damage, the lost chunk stays orange for
  **5.0s** (Bloodborne's window); damage dealt during the window converts back
  at **65%** `[tune]`; heavier hits rally more; **viscerals restore the maximum**
  (all faithful to BB's rally rules). *The* Bloodborne mechanic — retreating
  must feel like a loss.
- **Parry (gun-parry)** — Shardcaster shot landed during an enemy's flagged
  wind-up (active window **~11 frames / 0.18s** `[tune]`) staggers them →
  **Visceral Attack** prompt: massive damage, full invulnerability during the
  animation (BB rule), max rally refund, gem-shard fountain. **Forgiveness
  ladder** (Unsighted's lesson): a near-miss shot still chips and briefly
  stumbles the enemy without the full stagger. Whiffed shots cost a shard.
  A practice dummy stands in the Vigil Chapel courtyard (Unsighted's parry
  trainer — teach the scariest mechanic risk-free).
- **Backstab visceral** — fully-charged heavy landed from behind → same stagger
  → visceral.
- **Healing — Gemwater Phials** — **charge-based, refill at lamps** (Estus
  model). *Deliberate, research-confirmed deviation:* blood-vial farming is
  Bloodborne's single most criticized system ("adds a grind precisely when
  players are stuck"), a mistake FromSoftware itself walked back in Sekiro and
  Elden Ring. We keep the *feel* (fast, animation-committed swig) without the
  farming.
- **Death** — drop all **Gemdust** where you died; one recovery chance. Nearby
  enemies may *absorb* it (glowing red eyes — the GMTK-praised BB twist that
  turns recovery into a hunt). Second death: dust shatters (gone).
  **Death-to-retry under 2 seconds, never replay cutscenes** — Rubinite's
  96%-positive demo is credited to exactly this retry-loop polish.
- **Lucidity** *(Insight analog)* — gained from witnessing bosses, secret horrors,
  Marrow Shards. At thresholds (1/5/10/15): the soundtrack gains a whisper layer,
  hidden doors and NPC dialogue appear, certain enemies grow crystal eyes and new
  attacks. Spent at a hidden vendor (the **Tooth Broker**) for rare gems.
- **Vigil Lamps** — checkpoints: refill phials, respawn enemies, access Facet
  menu (level up via Maud remotely after meeting her). Deliberately sparse —
  shortcuts, not checkpoints, are the safety net.

**Telegraph language (one language, never broken — Hades II's Chronos lesson):**

- **Red ground shapes** (arcs/circles projected on the *ground* plane, filling
  radially in sync with the wind-up) = get out, dodge.
- **Yellow/white body flash** (2 frames, right before active frames) = parryable
  melee incoming.
- Every attack: anticipation pose 300–600ms scaled by damage + rising-pitch SFX.
- Enemies never attack from off-screen: aggro/attack ranges clamped to ~80% of
  viewport distance (Tunic's documented flaw, avoided).

**Juice budget (non-negotiable, research-anchored):** hit-stop by skipping
entity updates: 3 frames (~50ms — the perception-research sweet spot) light,
6 medium, 8–10 heavy/visceral, **victim frozen ~2 frames longer than attacker**
(Capcom's *The Punisher* trick); 1–2 frame white flash on victim; knockback on
every hit; 2–6px screenshake scaled by damage (exp decay ~0.85/frame), 8–10px
on parry; camera lerps toward a point between player and aim; **permanence** —
corpses and blood decals persist on the ground layer (Vlambeer + Bloodborne
mood); blood + gem-shard particles; low-HP heartbeat vignette; rally chunk
flash on conversion; slow-mo 0.3× for 250ms on visceral kill `[tune all]`.

---

## 8. Verticality — the Anti-Flat Mandate

Engine-level, not decoration:

- **True Z-levels.** Every entity has `(x, y, z)` where z ∈ {0, 1, 2} per map,
  plus fractional z during stair/ladder transit.
- **Stairs** — walkable ramps interpolating z; combat continues on them (fighting
  down a stair-street with height advantage modifiers `[tune]` is a core Ember Row
  moment).
- **Ladders** — commit animation, both hands busy (vulnerable — classic tension);
  can slide down; enemies generally don't follow (specific climbers excepted).
- **Drop-downs** — one-way ledges; falling attack (**plunge**) onto enemies below.
- **Elevators & levers** — the shortcut currency. The *click* of a new loop is the
  reward beat of every play session.
- **Cross-layer combat rules:** melee only hits your own layer; Shardcaster,
  Watchman muskets, Chorister bolts, and Chainspike whip-form cross layers.
  Enemies上 can see and shoot you below (and vice versa).

**Engineering model (CrossCode's, adopted verbatim — best-documented reference):**

- Entities carry true 3D position: `pos {x, y, z}` (x/y ground plane, z height),
  `vel {x, y, z}`; movement input only accelerates x/y; z is owned by a gravity
  integrator; air friction 0.2 vs ground 1.0 while airborne.
- Levels = stack of discrete height tiers; one collision grid per tier;
  entities bound to a tier index (fractional during stair/ladder transit).
- **Cross-tier combat rule:** hits connect only when `|attackerTier −
  targetTier| ≤ 1` (CrossCode's rule — tier deltas, not pixel z-ranges).
- Pathfinding: one nav grid per tier; jump-down edges auto-computed at ledges;
  enemies mostly leash to their tier (authentic and cheap).

**Rendering height in aerial view:**

- Draw sprites at `screenY = worldY − z`; **shadow blob pinned at ground z** —
  the sprite–shadow gap is THE height cue in every reference game; ships before
  any other vertical feature.
- Higher tiers draw above lower (painter's pass per tier, entities y-sorted by
  feet within tier); cliff faces drawn as vertical walls below top surfaces.
- Upper-layer geometry occluding the player fades to ~40% alpha in a radius, or
  the player draws as a tinted silhouette on top.
- Drop-downs: ledge tiles solid from the low side only; hop locks input
  ~150–200ms, gravity tweens z down, dust puff + shadow rising to meet the
  sprite on landing.

---

## 9. Skill System — Facets

Your payment was a socket; inside it sits your **soul-gem**. Maud *cuts facets*
into it at the Vigil Chapel — the level-up fiction. Costs Gemdust; major nodes
additionally cost **Seams** (boss drops).

Four branches × 6 nodes, with cross-links at tiers 2 and 4 (pick-two gates so
builds diverge):

- **VIGOR** — max HP, stamina pool, rally window duration, phial potency.
  *Capstone:* **Stonewarm Heart** — rally window doesn't decay while you're
  attacking.
- **FEROCITY** — weapon damage, visceral damage, rally conversion rate, charged
  attack speed. *Capstone:* **Red Momentum** — each hit in a combo raises rally
  conversion (up to 100%).
- **GRACE** — dash distance/recovery, i-frame duration, stair/ladder speed,
  stamina costs. *Capstone:* **Between Heartbeats** — a perfectly-timed dash
  (last 0.05s) refunds its stamina and leaves a shard afterimage that detonates.
- **LITHOMANCY** — Shardcaster damage/ammo, parry window +0.04s/rank, Lucidity
  gain, gem drop quality. *Capstone:* **The Answering Light** — viscerals refund
  a phial charge.

Respec: rare consumable (**Blank Facet**), found not bought.

---

## 10. Perk System — Bloodgems

Bloodborne's gem system *is* our perk system — diegetic and literal:

- **Sockets:** each weapon has 2, your body has 2 (+1 hidden body socket unlocked
  by a Lucidity-15 event).
- **Gems drop** from elites, bosses, and hidden caches; graded by **cut**
  (common → flawless) and **shape** (which socket types accept them).
- Examples:
  - *Leech Facet* — 2% lifesteal (body)
  - *Tick's Eye* — dash leaves a damaging shard trail (body)
  - *Gilded Core* — +25% Gemdust, −10% defense (body, cursed-adjacent)
  - *Whetstone Gem* — +12% physical on weapon (weapon)
  - *Hollow Facet* — +30% visceral damage, phials heal 15% less (**cursed**: big
    buff, real cost — the BB gamble)
- Gems are *the* reason to fight elites and re-clear with Lucidity high.

---

## 11. Art Direction

Anchored on what Rubinite actually is (Cup Dog Games; "Overwhelmingly Positive"
Steam demo, 96%): dark-fantasy **pixel art**, 3/4 overhead camera in the Titan
Souls–Hyper Light Drifter lineage, whose identity is *ruby on darkness*.

- **Camera:** 3/4 overhead — world read from above, characters drawn in
  three-quarter view on a dominant ground plane. NOT straight vertical top-down.
  Fixed rotation, soft follow with combat lookahead toward aim.
- **Style:** pixel art at a fixed internal resolution (640×360, integer upscale,
  `imageSmoothingEnabled = false`). Small, chunky, highly readable hero sprite
  vs **huge multi-tile bosses** (Rubinite/Titan Souls scale contrast).
- **Two-tier fidelity** (Rubinite's signature): simple readable sprites in
  gameplay; lavish high-detail illustrated art for menus, portraits, cutscenes
  and the title screen — nano-banana-2 excels at exactly this split.
- **Palette:** near-black charcoal, cold desaturated greys, muted brass;
  **saturated bloodgem scarlet is the RESERVED signal color** — health, rally,
  telegraphs, crystals, key UI. If it's red, it means something (danger,
  currency, god). Mirrors both Rubinite ("scarlet kingdom on bleak darkness")
  and Bloodborne.
- **Light:** dynamic 2D point lights with flicker (lanterns, torches) — an
  offscreen light-map canvas with radial gradients composited over the scene;
  reviewers specifically noticed Rubinite's flickering lanterns. Level 2 swaps
  warm gaslight for red crystal glow. Drop shadows under every character
  (depth + aerial-attack telegraphs).
- **Animation budget goes to the dodge/parry moment** — Rubinite's perfect
  dodge "hits the brain the same way a parry does in Sekiro" via sound +
  animation + impact, not sprite fidelity. Also: turn in-betweens (rough
  direction changes were Rubinite's one animation criticism).
- **Process:** every fight is prototyped with blocky "tofu man" placeholders
  until it's *fun*, then skinned (Rubinite's own dev process).
- **Sprite plan:** player (4-dir base, per-weapon overlay stances), ~12 enemies,
  4 bosses, 2 tilesets (street/rooftop/canal; minehead/gantry/gallery), props,
  UI icons (gems, phials, shards), illustrated menu/title art.

**World-state escalation** (Bloodborne's hunt-night structure): the map
degenerates on boss milestones, not a clock — after the Gilded Beast falls,
crystal growths erupt through Ember Row and the sky deepens to red; after
Foreman Grist, the Seam-glow bleeds up into every light source. Same map,
new dread.

## 12. Audio Direction

Bloodborne's rule, confirmed by research: **music is reserved for bosses and
safe rooms; exploration lives in oppressive ambient sound** ("persistently
discordant harmonies ensure the music never offers any sensation of victory").

- **Music (ElevenLabs `/v1/music`, `model_id: music_v2`, `force_instrumental`):**
  2 boss tracks built as **composition plans** (free to draft via `/v1/music/plan`;
  chunks with exact `duration_ms` per phase → in-game phase transitions seek to
  known chunk offsets), chapel safe-room theme, title theme, ending stinger.
  Prompt vocabulary: "dark gothic orchestral, dissonant strings, deep Latin
  choir, church organ, tolling bells, 70 BPM in D minor, completely
  instrumental" — BPM + key included (the model follows them). Level 2 shifts
  acoustic→processed/electronic timbres as gothic gives way to cosmic (BB's own
  score arc). **Never name Bloodborne/FromSoftware in prompts** — the API
  rejects copyrighted references (`bad_prompt`).
- **Ambience (SFX API with `loop: true`, 20–30s beds):** gapless native looping
  confirmed — "low howling wind through gothic stone streets, distant tolling
  bell, creaking wood, horror ambience, loop" per district; heartbeat + crystal
  chimes bed for the Undervein.
- **SFX (`/v1/sound-generation`, explicit `duration_seconds`, prompt_influence
  0.7–0.9 for one-shots):** dash whoosh, 3 weapon impact tiers ("heavy wet flesh
  impact with bone crunch, visceral, one-shot"), parry ("sharp metallic clang
  with ringing tail, gunshot crack"), visceral squelch, rally shimmer, lamp
  chime (the safety sound — must be *beautiful*), ladder creaks, beast roars
  ("guttural inhuman beast roar, layered snarl, cathedral reverb tail"), ticker
  chitter, elevator chain, phial swig, death bell, boss-intro **braam**.
- **Cost reality:** music $0.15/min, SFX $0.12/min (40 credits/sec with explicit
  duration) — the full audio pass fits comfortably in the key's pay-as-you-go
  budget. Generate at build time into `assets/audio/`, never at runtime.

## 13. Tech

- **Stack:** Vite + TypeScript + Canvas2D, custom engine. No framework — full
  control over the z-layer renderer and frame-exact combat timing.
- **Engine:** fixed-timestep sim (60Hz) with interpolated render; input buffer
  (150ms `[tune]`) so parry/dash feel responsive; AABB+circle collision per
  z-layer; A* on per-layer navgrids with stair/ladder links; enemy AI as state
  machines (idle/patrol/alert/attack/recover/stagger).
- **Data-driven:** levels, enemies, weapons, gems, dialogue as JSON under
  `src/data/` — content iterations don't touch engine code.

---

## 14. What "the Bloodborne feeling" means here — checklist

`[research: validate & extend]` Every build gets checked against this list:

- [ ] Retreating feels worse than attacking (rally works)
- [ ] The first shortcut unlock produces an audible "OH." (loop design works)
- [ ] Deaths feel like your fault (telegraphs readable at aerial view)
- [ ] The parry is scary to attempt and euphoric to land
- [ ] Height is tactically real (you route through Z, not just around X/Y)
- [ ] The city feels like it hates you, then like it's yours
- [ ] The last hour recontextualizes the first (god reveal lands)
