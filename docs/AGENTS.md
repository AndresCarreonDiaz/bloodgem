# Working on Bloodgem — agent onboarding

Read this first. Then read `docs/ROADMAP.md` (live state + iteration log) and
skim `docs/GDD.md` (the design bible). GitHub Issues is the task board:
**take an issue, do the work, verify, close it with a comment saying what you
did and how it was verified.** If you can't finish or something blocks you,
comment on the issue with exactly why and leave it open.

## The two verification suites — run BOTH before closing any issue

```bash
npm install
npm run build                                # tsc + vite, must be clean
npx vite preview --port 4199 &               # serve the build
node scripts/dev-verify.mjs /tmp             # 62 gameplay checks (headless Chromium)
node scripts/audit-paths.mjs                 # 18 structural/reachability checks
```

Both suites green = mergeable. A change that breaks a check is wrong until
proven otherwise — the suites have caught 16 real bugs so far. When you add a
feature, add checks for it in `scripts/dev-verify.mjs` (gameplay) and/or
`scripts/audit-paths.mjs` (level structure).

## Architecture in one minute

- `src/engine/` — input (buffered presses), camera (aim-lean + shake), audio
  (Web Audio, event-driven), sprites (async store w/ tofu fallback), particles.
- `src/game/level.ts` — THE world model: heightmap tiers (0 canal / 1 street /
  2 rampart, 9 wall), ramp regions (stairs = fractional z), ladders (lockable),
  gates, elevators (moving ground), transitions, props, decals, NPCs, secrets.
  `groundZAt()` is the single source of truth for elevation.
- `src/game/game.ts` — orchestration: combat resolution, bosses, saves
  (localStorage), flags (`bruteDefeated`, `gatesOpen`, …) that survive level
  swaps and deaths, dialogue/menu/pause states, the event queue that drives audio.
- `src/game/player.ts` + `skills.ts` — stat block (`computeStats`) rebuilt from
  skill ranks + gems; never mutate stats directly.
- Bosses are one file each (`brute.ts`, `grist.ts`, `mother.ts`, `cassar.ts`):
  state machines with `parryable` getters, `pending*` flags consumed by game.ts.
- `scripts/gen-image.mjs` / `gen-audio.mjs` — asset generation (Replicate
  nano-banana-2 with green-screen chroma-key; ElevenLabs). Needs keys in `.env`
  (`REPLICATE_API_TOKEN`, `ELEVENLABS_API_KEY`) — **the original keys may be
  revoked; ask the repo owner before asset work.** Generated art is committed,
  so gameplay work never needs the APIs.

## House rules (learned the hard way — see ROADMAP iteration log)

1. `input.consume()` must be the LAST condition in any `if` — it eats the
   buffered press even when other conditions fail.
2. Aim math: screen→world ignores elevation; project the cursor onto the
   player's z-plane (see `main.ts`). Anything drawn at `worldY − z` needs this.
3. A stagger buys ONE visceral — `resolveVisceral` consumes the state.
4. Test positions in `dev-verify.mjs`: teleport, then wait ~800ms for the
   camera to settle before converting world→screen (aim-lean moves the view).
5. Red = the reserved signal color. If it's red it means danger/currency/god.
   Don't add red UI that means nothing.
6. Tone: oblique, Bloodborne-flavored, never jokey. Item text carries lore.

## Play it

`npm run dev` → WASD + mouse, LMB strike, RMB parry, Space dash, Q transform,
X swap weapon, F phial, E interact, Esc pause (shows current objective).
