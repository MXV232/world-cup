export type Round = 'R32' | 'R16' | 'QF' | 'SF' | 'FINAL';
export type Side = 'L' | 'R';

export interface MatchDef {
  id: string;
  round: Round;
  /** null for the Final */
  side: Side | null;
  /** where the winner of this match flows next; null for the Final */
  next: { matchId: string; slot: 0 | 1 } | null;
}

const ROUND_ORDER: Exclude<Round, 'FINAL'>[] = ['R32', 'R16', 'QF', 'SF'];
const ROUND_SIZES: Record<Exclude<Round, 'FINAL'>, number> = { R32: 8, R16: 4, QF: 2, SF: 1 };
const NEXT_ROUND: Record<Exclude<Round, 'FINAL'>, Round> = {
  R32: 'R16',
  R16: 'QF',
  QF: 'SF',
  SF: 'FINAL',
};

function build(): MatchDef[] {
  const matches: MatchDef[] = [];
  for (const side of ['L', 'R'] as Side[]) {
    for (const round of ROUND_ORDER) {
      for (let i = 0; i < ROUND_SIZES[round]; i++) {
        const id = `${side}-${round}-${i}`;
        const next =
          round === 'SF'
            ? { matchId: 'FINAL', slot: (side === 'L' ? 0 : 1) as 0 | 1 }
            : {
                matchId: `${side}-${NEXT_ROUND[round]}-${Math.floor(i / 2)}`,
                slot: (i % 2) as 0 | 1,
              };
        matches.push({ id, round, side, next });
      }
    }
  }
  matches.push({ id: 'FINAL', round: 'FINAL', side: null, next: null });
  return matches;
}

export const MATCHES: MatchDef[] = build();

export const MATCH_BY_ID: Record<string, MatchDef> = Object.fromEntries(
  MATCHES.map((m) => [m.id, m]),
);

/** matchId -> [feeder match feeding slot 0, feeder match feeding slot 1] */
export const FEEDERS: Record<string, [string | null, string | null]> = {};
for (const m of MATCHES) FEEDERS[m.id] = [null, null];
for (const m of MATCHES) {
  if (m.next) FEEDERS[m.next.matchId][m.next.slot] = m.id;
}

export const ROUND_LABELS: Record<Round, string> = {
  R32: 'Round of 32',
  R16: 'Round of 16',
  QF: 'Quarter-finals',
  SF: 'Semi-finals',
  FINAL: 'Final',
};

export const matchesFor = (side: Side, round: Exclude<Round, 'FINAL'>): MatchDef[] =>
  MATCHES.filter((m) => m.side === side && m.round === round);

// ---------------------------------------------------------------------------
// Official 2026 Round-of-32 seeding (FIFA / Wikipedia knockout-stage bracket).
//
// Each R32 slot has a fixed seed identity: a specific group's winner ("1A"),
// a specific group's runner-up ("2B"), or one of the qualifying third-placed
// teams drawn from a fixed set of five groups ("3rd"). A team may only be
// dropped into a slot its group is eligible for.
// ---------------------------------------------------------------------------

export type Seed =
  | { kind: 'winner'; group: string }
  | { kind: 'runner'; group: string }
  | { kind: 'third'; groups: string[] };

const W = (group: string): Seed => ({ kind: 'winner', group });
const RU = (group: string): Seed => ({ kind: 'runner', group });
const T = (...groups: string[]): Seed => ({ kind: 'third', groups });

// The 16 R32 matches in official bracket order (matches 73..88). The first
// eight form the left half of the bracket, the last eight the right half, so
// the downstream R16/QF/SF wiring matches the real tournament.
const R32_ORDER: [Seed, Seed][] = [
  [W('E'), T('A', 'B', 'C', 'D', 'F')], //  74
  [W('I'), T('C', 'D', 'F', 'G', 'H')], //  77
  [RU('A'), RU('B')], //               73
  [W('F'), RU('C')], //                75
  [RU('K'), RU('L')], //               83
  [W('H'), RU('J')], //                84
  [W('D'), T('B', 'E', 'F', 'I', 'J')], //  81
  [W('G'), T('A', 'E', 'H', 'I', 'J')], //  82
  [W('C'), RU('F')], //                76
  [RU('E'), RU('I')], //               78
  [W('A'), T('C', 'E', 'F', 'H', 'I')], //  79
  [W('L'), T('E', 'H', 'I', 'J', 'K')], //  80
  [W('J'), RU('H')], //                86
  [RU('D'), RU('G')], //               88
  [W('B'), T('E', 'F', 'G', 'I', 'J')], //  85
  [W('K'), T('D', 'E', 'I', 'J', 'L')], //  87
];

const R32_MATCH_IDS = [
  'L-R32-0', 'L-R32-1', 'L-R32-2', 'L-R32-3', 'L-R32-4', 'L-R32-5', 'L-R32-6', 'L-R32-7',
  'R-R32-0', 'R-R32-1', 'R-R32-2', 'R-R32-3', 'R-R32-4', 'R-R32-5', 'R-R32-6', 'R-R32-7',
];

/** R32 matchId -> [seed for slot 0, seed for slot 1] */
export const R32_SEEDS: Record<string, [Seed, Seed]> = {};
R32_MATCH_IDS.forEach((id, i) => {
  R32_SEEDS[id] = R32_ORDER[i];
});

export function seedAcceptsGroup(seed: Seed, group: string): boolean {
  return seed.kind === 'third' ? seed.groups.includes(group) : seed.group === group;
}

/** Short tag shown in the slot, e.g. "1A", "2B", "3rd". */
export function seedLabel(seed: Seed): string {
  if (seed.kind === 'winner') return `1${seed.group}`;
  if (seed.kind === 'runner') return `2${seed.group}`;
  return '3rd';
}

/** Full description for tooltips, e.g. "Runner-up Group B" or "3rd place — Group C/E/F/H/I". */
export function seedTitle(seed: Seed): string {
  if (seed.kind === 'winner') return `Winner Group ${seed.group}`;
  if (seed.kind === 'runner') return `Runner-up Group ${seed.group}`;
  return `3rd place — Group ${seed.groups.join('/')}`;
}
