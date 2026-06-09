import { MATCH_BY_ID, FEEDERS, R32_SEEDS } from '../data/bracket';
import { THIRD_ALLOCATION, THIRD_COLUMN_MATCH } from '../data/thirdAllocation';
import { teamById } from '../data/groups';
import type { Team } from '../data/teams';

export interface BracketState {
  /** R32 matchId -> [teamId | null, teamId | null]; only winner/runner slots are used here */
  r32: Record<string, [string | null, string | null]>;
  /** the (up to 8) third-placed teams the user has marked as qualifying, distinct groups */
  thirds: string[];
  /** any matchId -> winning slot index (or null) */
  winners: Record<string, 0 | 1 | null>;
}

export type Action =
  | { type: 'PLACE'; matchId: string; slot: 0 | 1; teamId: string }
  | { type: 'CLEAR_SLOT'; matchId: string; slot: 0 | 1 }
  | { type: 'ADD_THIRD'; teamId: string }
  | { type: 'REMOVE_THIRD'; teamId: string }
  | { type: 'PICK'; matchId: string; slot: 0 | 1 }
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
  return { r32, thirds: [], winners };
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
