import { MATCH_BY_ID, FEEDERS, R32_SEEDS } from '../data/bracket';
import { THIRD_ALLOCATION, THIRD_COLUMN_MATCH } from '../data/thirdAllocation';
import { GROUPS, teamById } from '../data/groups';
import type { Group } from '../data/groups';
import type { Team } from '../data/teams';

// All 6 pair indices for a 4-team group: (0,1),(0,2),(0,3),(1,2),(1,3),(2,3)
export const GROUP_PAIRS: [number, number][] = [];
for (let i = 0; i < 4; i++)
  for (let j = i + 1; j < 4; j++)
    GROUP_PAIRS.push([i, j]);

export interface Standing {
  team: Team;
  pts: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  played: number;
}

export function computeGroupStandings(group: Group, groupScores: GroupScores): Standing[] {
  const stats = new Map<string, Standing>(
    group.teams.map((t) => [t.id, { team: t, pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, played: 0 }]),
  );
  for (const [i, j] of GROUP_PAIRS) {
    const key = `${group.id}-${i}${j}`;
    const scores = groupScores[key];
    if (!scores || scores[0] === null || scores[1] === null) continue;
    const [hg, ag] = scores as [number, number];
    const home = stats.get(group.teams[i].id)!;
    const away = stats.get(group.teams[j].id)!;
    home.gf += hg; home.ga += ag; home.gd += hg - ag; home.played++;
    away.gf += ag; away.ga += hg; away.gd += ag - hg; away.played++;
    if (hg > ag) { home.w++; home.pts += 3; away.l++; }
    else if (hg < ag) { away.w++; away.pts += 3; home.l++; }
    else { home.d++; home.pts++; away.d++; away.pts++; }
  }
  return [...stats.values()].sort(
    (a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.id.localeCompare(b.team.id),
  );
}

/** groupId-ij (e.g. "A-01") -> [homeScore | null, awayScore | null] */
export type GroupScores = Record<string, [number | null, number | null]>;

export interface BracketState {
  /** R32 matchId -> [teamId | null, teamId | null]; only winner/runner slots are used here */
  r32: Record<string, [string | null, string | null]>;
  /** the (up to 8) third-placed teams the user has marked as qualifying, distinct groups */
  thirds: string[];
  /** any matchId -> winning slot index (or null) */
  winners: Record<string, 0 | 1 | null>;
  /** group stage match scores, keyed by "A-01" (group A, team[0] vs team[1]) */
  groupScores: GroupScores;
}

export type Action =
  | { type: 'PLACE'; matchId: string; slot: 0 | 1; teamId: string }
  | { type: 'CLEAR_SLOT'; matchId: string; slot: 0 | 1 }
  | { type: 'ADD_THIRD'; teamId: string }
  | { type: 'REMOVE_THIRD'; teamId: string }
  | { type: 'PICK'; matchId: string; slot: 0 | 1 }
  | { type: 'SET_GROUP_SCORE'; matchKey: string; scores: [number | null, number | null] }
  | { type: 'FILL_FROM_STANDINGS'; placements: { matchId: string; slot: 0 | 1; teamId: string }[]; thirds: string[] }
  | { type: 'CLEAR_BRACKET' }
  | { type: 'RESET' };

/** The 8 R32 matches whose slot 1 is filled by a qualifying third-placed team. */
export const THIRD_MATCH_IDS: string[] = [...new Set(THIRD_COLUMN_MATCH)];

export function initialState(): BracketState {
  const r32: BracketState['r32'] = {};
  const winners: BracketState['winners'] = {};
  for (const m of Object.values(MATCH_BY_ID)) {
    winners[m.id] = null;
    if (m.round === 'R32') r32[m.id] = [null, null];
  }
  return { r32, thirds: [], winners, groupScores: {} };
}

/** Clear winners of every match downstream of `matchId` (the matchup there changed). */
function clearDownstream(winners: BracketState['winners'], matchId: string): void {
  let m = MATCH_BY_ID[matchId];
  while (m && m.next) {
    winners[m.next.matchId] = null;
    m = MATCH_BY_ID[m.next.matchId];
  }
}

/** The third-place set changed, so re-seeding reshuffles every third match: clear them all. */
function clearThirdMatches(winners: BracketState['winners']): void {
  for (const id of THIRD_MATCH_IDS) {
    winners[id] = null;
    clearDownstream(winners, id);
  }
}

/** Remove a team from any winner/runner slot it occupies; returns the mutated r32 copy. */
function removeFromSlots(
  r32: BracketState['r32'],
  winners: BracketState['winners'],
  teamId: string,
): void {
  for (const id of Object.keys(r32)) {
    const pair = r32[id];
    if (pair[0] === teamId || pair[1] === teamId) {
      r32[id] = [pair[0] === teamId ? null : pair[0], pair[1] === teamId ? null : pair[1]];
      winners[id] = null;
      clearDownstream(winners, id);
    }
  }
}

export function reducer(state: BracketState, action: Action): BracketState {
  switch (action.type) {
    case 'RESET':
      return initialState();

    case 'CLEAR_BRACKET': {
      const r32: BracketState['r32'] = {};
      const winners: BracketState['winners'] = {};
      for (const m of Object.values(MATCH_BY_ID)) {
        winners[m.id] = null;
        if (m.round === 'R32') r32[m.id] = [null, null];
      }
      return { ...state, r32, thirds: [], winners };
    }

    case 'PLACE': {
      // Winner/runner slots only (third slots are filled via the thirds tray).
      if (R32_SEEDS[action.matchId]?.[action.slot]?.kind === 'third') return state;
      const r32 = { ...state.r32 };
      const winners = { ...state.winners };
      let thirds = state.thirds;
      // A team can occupy only one place: pull it out of any slot or the thirds tray.
      removeFromSlots(r32, winners, action.teamId);
      if (thirds.includes(action.teamId)) {
        thirds = thirds.filter((t) => t !== action.teamId);
        clearThirdMatches(winners);
      }
      const target: [string | null, string | null] = [...(r32[action.matchId] ?? [null, null])];
      target[action.slot] = action.teamId;
      r32[action.matchId] = target;
      winners[action.matchId] = null;
      clearDownstream(winners, action.matchId);
      return { r32, thirds, winners };
    }

    case 'CLEAR_SLOT': {
      const r32 = { ...state.r32 };
      const winners = { ...state.winners };
      const target: [string | null, string | null] = [...(r32[action.matchId] ?? [null, null])];
      target[action.slot] = null;
      r32[action.matchId] = target;
      winners[action.matchId] = null;
      clearDownstream(winners, action.matchId);
      return { ...state, r32, winners };
    }

    case 'ADD_THIRD': {
      const team = teamById(action.teamId);
      if (!team) return state;
      // One third per group, and at most eight.
      const groups = new Set(state.thirds.map((id) => teamById(id)?.groupId));
      if (state.thirds.includes(action.teamId)) return state;
      if (groups.has(team.groupId) || state.thirds.length >= 8) return state;

      const r32 = { ...state.r32 };
      const winners = { ...state.winners };
      removeFromSlots(r32, winners, action.teamId); // was it a winner/runner? move it
      const thirds = [...state.thirds, action.teamId];
      clearThirdMatches(winners);
      return { r32, thirds, winners };
    }

    case 'REMOVE_THIRD': {
      if (!state.thirds.includes(action.teamId)) return state;
      const winners = { ...state.winners };
      const thirds = state.thirds.filter((t) => t !== action.teamId);
      clearThirdMatches(winners);
      return { ...state, thirds, winners };
    }

    case 'PICK': {
      const winners = { ...state.winners, [action.matchId]: action.slot };
      clearDownstream(winners, action.matchId);
      return { ...state, winners };
    }

    case 'SET_GROUP_SCORE':
      return { ...state, groupScores: { ...state.groupScores, [action.matchKey]: action.scores } };

    case 'FILL_FROM_STANDINGS': {
      const r32: BracketState['r32'] = {};
      const winners: BracketState['winners'] = {};
      for (const m of Object.values(MATCH_BY_ID)) {
        winners[m.id] = null;
        if (m.round === 'R32') r32[m.id] = [null, null];
      }
      for (const { matchId, slot, teamId } of action.placements) {
        const pair: [string | null, string | null] = [...(r32[matchId] ?? [null, null])];
        pair[slot] = teamId;
        r32[matchId] = pair;
      }
      return { ...state, r32, thirds: action.thirds, winners };
    }

    default:
      return state;
  }
}

// ---------- derived selectors ----------

/**
 * When exactly 8 thirds (distinct groups) are chosen, FIFA's allocation table fixes
 * which third faces which group winner. Returns thirdMatchId -> teamId, else {}.
 */
export function thirdAssignment(state: BracketState): Record<string, string> {
  if (state.thirds.length !== 8) return {};
  const byGroup: Record<string, string> = {};
  for (const tid of state.thirds) {
    const t = teamById(tid);
    if (t) byGroup[t.groupId] = tid;
  }
  const key = Object.keys(byGroup).sort().join('');
  const alloc = key.length === 8 ? THIRD_ALLOCATION[key] : undefined;
  if (!alloc) return {};
  const out: Record<string, string> = {};
  for (let i = 0; i < THIRD_COLUMN_MATCH.length; i++) {
    const tid = byGroup[alloc[i]];
    if (tid) out[THIRD_COLUMN_MATCH[i]] = tid;
  }
  return out;
}

/** Resolve the two teams that currently occupy a match's slots. */
export function resolvedSlots(state: BracketState, matchId: string): [Team | null, Team | null] {
  const def = MATCH_BY_ID[matchId];
  if (def.round === 'R32') {
    const seeds = R32_SEEDS[matchId];
    const ids = state.r32[matchId] ?? [null, null];
    const assign = thirdAssignment(state);
    const out: [Team | null, Team | null] = [null, null];
    for (const slot of [0, 1] as const) {
      if (seeds?.[slot].kind === 'third') {
        const tid = assign[matchId];
        out[slot] = tid ? teamById(tid) : null;
      } else {
        out[slot] = ids[slot] ? teamById(ids[slot]) : null;
      }
    }
    return out;
  }
  const feeders = FEEDERS[matchId];
  const out: [Team | null, Team | null] = [null, null];
  for (const slot of [0, 1] as const) {
    const f = feeders[slot];
    if (!f) continue;
    const w = state.winners[f];
    if (w === 0 || w === 1) out[slot] = resolvedSlots(state, f)[w];
  }
  return out;
}

/** The team that won a match, but only if it still has a valid occupant. */
export function effectiveWinner(state: BracketState, matchId: string): Team | null {
  const w = state.winners[matchId];
  if (w !== 0 && w !== 1) return null;
  return resolvedSlots(state, matchId)[w];
}

export function placedTeamIds(state: BracketState): Set<string> {
  const set = new Set<string>();
  for (const pair of Object.values(state.r32)) {
    if (pair[0]) set.add(pair[0]);
    if (pair[1]) set.add(pair[1]);
  }
  for (const tid of state.thirds) set.add(tid);
  return set;
}

/** Groups that already have a qualifying third placed. */
export function thirdGroups(state: BracketState): Set<string> {
  return new Set(state.thirds.map((id) => teamById(id)?.groupId).filter(Boolean) as string[]);
}

export function champion(state: BracketState): Team | null {
  return effectiveWinner(state, 'FINAL');
}

/**
 * Derive R32 placements and a best-8 thirds list from the current group scores.
 * Only fills slots for teams that have actually played at least one match.
 */
export function computeFillFromStandings(groupScores: GroupScores): {
  placements: { matchId: string; slot: 0 | 1; teamId: string }[];
  thirds: string[];
} {
  // Build reverse map: group -> { matchId, slot } for winner and runner seeds
  const winnerFor: Record<string, { matchId: string; slot: 0 | 1 }> = {};
  const runnerFor: Record<string, { matchId: string; slot: 0 | 1 }> = {};
  for (const [matchId, seeds] of Object.entries(R32_SEEDS)) {
    for (const slot of [0, 1] as const) {
      const seed = seeds[slot];
      if (seed.kind === 'winner') winnerFor[seed.group] = { matchId, slot };
      if (seed.kind === 'runner') runnerFor[seed.group] = { matchId, slot };
    }
  }

  const placements: { matchId: string; slot: 0 | 1; teamId: string }[] = [];
  const thirdCandidates: { teamId: string; pts: number; gd: number; gf: number }[] = [];

  for (const group of GROUPS) {
    const standings = computeGroupStandings(group, groupScores);
    const [first, second, third] = standings;

    if (first.played > 0) {
      const ws = winnerFor[group.id];
      if (ws) placements.push({ matchId: ws.matchId, slot: ws.slot, teamId: first.team.id });
    }
    if (second && second.played > 0) {
      const rs = runnerFor[group.id];
      if (rs) placements.push({ matchId: rs.matchId, slot: rs.slot, teamId: second.team.id });
    }
    if (third && third.played > 0) {
      thirdCandidates.push({ teamId: third.team.id, pts: third.pts, gd: third.gd, gf: third.gf });
    }
  }

  thirdCandidates.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  const thirds = thirdCandidates.slice(0, 8).map((t) => t.teamId);

  return { placements, thirds };
}
