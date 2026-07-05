// The voices of Veinmouth. Lines are chosen by world state — the city
// notices what you've done, which is most of what makes a world feel real.

export interface WorldFlags {
  bruteDefeated: boolean;
  gristDefeated: boolean;
  motherDefeated: boolean;
  cassarDefeated: boolean;
}

export interface NpcScript {
  name: string;
  lines: (f: WorldFlags) => string[];
}

export const DIALOG: Record<string, NpcScript> = {
  dunhill: {
    name: 'DUNHILL, THE FERRYMAN',
    lines: (f) => {
      if (f.motherDefeated) return [
        'Water’s gone still as glass. First time in forty years.',
        'Whatever you did down there… the canal approves.',
        'In you get. No charge tonight.',
      ];
      return [
        'Evenin’. Mind the cargo — it minds you.',
        'Canal runs the whole south of the Row. Faster than the streets,',
        'and the streets have opinions tonight.',
        'In you get, then.',
      ];
    },
  },
  broker: {
    name: 'THE TOOTH BROKER',
    lines: () => [
      'Ohh. A lucid one. I only trade with the lucid — the rest bite.',
      'One item tonight, cutter, one only: a SERRATED FACET.',
      'Cut from a rally-hound’s heart-gem. Your blood comes back angrier.',
      'Four hundred dust. Walk away, or stay and pay.',
    ],
  },
  maud: {
    name: 'MAUD, THE BLIND POLISHER',
    lines: (f) => {
      if (f.motherDefeated) return [
        'You touched the seam. I can smell it on you — warm, like a hearth.',
        'Like a wound.',
        'Whatever you chose down there, cutter… I hope you chose it awake.',
      ];
      if (f.bruteDefeated) return [
        'The chains went quiet. That poor ox of a man —',
        'he carried the first gems up out of that pit, you know. Before they carried him.',
        'The gate to the mine stands open. The Provost will call it providence.',
        'Call it what it is. A mouth.',
      ];
      return [
        'Hold still, cutter. The lamp likes you.',
        'Every facet I cut is a small forgetting. What you buy with dust, you pay for twice.',
        'The Guild rings its bells like nothing is wrong.',
        'Listen how nothing answers.',
      ];
    },
  },
  verne: {
    name: 'PROVOST MALACHAI VERNE',
    lines: (f) => {
      if (f.motherDefeated) return [
        'You saw it, then. The heart.',
        'And still you came back up. That is the part I cannot fathom.',
        'Seal it, cutter. A city that forgets is a city that survives.',
        'Dawn needs its lie.',
      ];
      if (f.bruteDefeated) return [
        'So the hauler is dead. He was paid in gems, same as you.',
        'Remember that arithmetic.',
        'Beyond this gate lies the Undervein. Take the lift. Mind the gantry.',
        'And touch nothing that sings.',
      ];
      return [
        'Ah. The outland cutter. Your socket has taken beautifully — the Guild’s finest work.',
        'Ignore the streets. The city has these… fevers.',
        'By dawn it will drink and forget, as it always does.',
        'The Vigil must reach the Heartseam. Everything depends on it.',
        'Everything already has.',
      ];
    },
  },
  sissel: {
    name: 'SISSEL',
    lines: (f) => {
      if (f.motherDefeated) return [
        'I had a dream the whole city was inside a jewel,',
        'and something big was looking in at us.',
        'You look tired, hunter. When it’s over, someone should tell you it was enough.',
        'So: it was enough.',
      ];
      if (f.bruteDefeated) return [
        'The big bell by the square stopped. Did you stop it?',
        'You smell like sparks.',
        'When it’s morning, I’m going to light every lamp on this street.',
        'Every single one.',
      ];
      return [
        'Papa said stay by the lamps. The lamps are warm.',
        'The people aren’t people right now.',
        'I lit this one myself. It stays lit if you believe it does.',
        'That’s what Maud says, anyway.',
      ];
    },
  },
};
