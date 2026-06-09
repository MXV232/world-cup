import { GROUPS, teamById } from '../data/groups';
import { R32_SEEDS, MATCHES } from '../data/bracket';
import { initialState, type BracketState } from './bracketReducer';

// ---------------------------------------------------------------------------
// Share codec: pack a whole prediction into a short, URL-safe string carried in
// the location hash (#p=...). The hash never reaches the server, which is ideal
// for a static GitHub Pages site.
//
// Byte layout (version 1, 68 bytes):
//   [0]        version (1)
//   [1..12]    winner team index per group A..L   (0-3, or 4 = empty)
//   [13..24]   runner-up team index per group A..L (0-3, or 4 = empty)
//   [25..36]   third indicator per group A..L      (0 = not qualified, 1..4 = index+1)
//   [37..67]   winner pick per match, in MATCHES order (0, 1, or 2 = undecided)
// ---------------------------------------------------------------------------

const VERSION = 1;
const SIZE = 68;
const OFF_WINNER = 1;
const OFF_RUNNER = 13;
const OFF_THIRD = 25;
const OFF_PICK = 37;
const EMPTY = 4;

const GROUP_ORDER = GROUPS.map((g) => g.id);
const GROUP_BY_ID = Object.fromEntries(GROUPS.map((g) => [g.id, g]));

// group -> the R32 slot that holds its winner / runner-up
const WINNER_SLOT: Record<string, { matchId: string; slot: 0 | 1 }> = {};
const RUNNER_SLOT: Record<string, { matchId: string; slot: 0 | 1 }> = {};
for (const matchId of Object.keys(R32_SEEDS)) {
  R32_SEEDS[matchId].forEach((seed, slot) => {
    if (seed.kind === 'winner') WINNER_SLOT[seed.group] = { matchId, slot: slot as 0 | 1 };
    else if (seed.kind === 'runner') RUNNER_SLOT[seed.group] = { matchId, slot: slot as 0 | 1 };
  });
}

function indexInGroup(groupId: string, teamId: string): number {
  const i = GROUP_BY_ID[groupId].teams.findIndex((t) => t.id === teamId);
  return i >= 0 ? i : EMPTY;
}

function base64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64url(s: string): Uint8Array | null {
  try {
    let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export function encodeState(state: BracketState): string {
  const bytes = new Uint8Array(SIZE);
  bytes[0] = VERSION;

  GROUP_ORDER.forEach((g, i) => {
    const wLoc = WINNER_SLOT[g];
    const wId = state.r32[wLoc.matchId]?.[wLoc.slot] ?? null;
    bytes[OFF_WINNER + i] = wId ? indexInGroup(g, wId) : EMPTY;

    const rLoc = RUNNER_SLOT[g];
    const rId = state.r32[rLoc.matchId]?.[rLoc.slot] ?? null;
    bytes[OFF_RUNNER + i] = rId ? indexInGroup(g, rId) : EMPTY;
  });

  const thirdByGroup: Record<string, string> = {};
  for (const id of state.thirds) {
    const t = teamById(id);
    if (t) thirdByGroup[t.groupId] = id;
  }
  GROUP_ORDER.forEach((g, i) => {
    const id = thirdByGroup[g];
    bytes[OFF_THIRD + i] = id ? indexInGroup(g, id) + 1 : 0;
  });

  MATCHES.forEach((m, i) => {
    const w = state.winners[m.id];
    bytes[OFF_PICK + i] = w === 0 || w === 1 ? w : 2;
  });

  return base64url(bytes);
}

export function decodePayload(payload: string): BracketState | null {
  const bytes = fromBase64url(payload);
  if (!bytes || bytes.length < SIZE || bytes[0] !== VERSION) return null;

  const st = initialState();

  GROUP_ORDER.forEach((g, i) => {
    const teams = GROUP_BY_ID[g].teams;

    const wi = bytes[OFF_WINNER + i];
    if (wi < EMPTY && teams[wi]) {
      const loc = WINNER_SLOT[g];
      st.r32[loc.matchId][loc.slot] = teams[wi].id;
    }

    const ri = bytes[OFF_RUNNER + i];
    if (ri < EMPTY && teams[ri]) {
      const loc = RUNNER_SLOT[g];
      st.r32[loc.matchId][loc.slot] = teams[ri].id;
    }
  });

  const thirds: string[] = [];
  GROUP_ORDER.forEach((g, i) => {
    const v = bytes[OFF_THIRD + i];
    if (v >= 1 && v <= 4) {
      const t = GROUP_BY_ID[g].teams[v - 1];
      if (t) thirds.push(t.id);
    }
  });
  st.thirds = thirds;

  MATCHES.forEach((m, i) => {
    const v = bytes[OFF_PICK + i];
    st.winners[m.id] = v === 0 || v === 1 ? v : null;
  });

  return st;
}

/** Read and decode a shared prediction from the current URL hash, if present. */
export function decodeShareFromHash(): BracketState | null {
  if (typeof location === 'undefined') return null;
  const m = (location.hash || '').match(/[#&]p=([^&]+)/);
  return m ? decodePayload(m[1]) : null;
}

export function hasShareInHash(): boolean {
  return typeof location !== 'undefined' && /[#&]p=/.test(location.hash || '');
}

export function buildShareUrl(state: BracketState): string {
  const base = location.origin + location.pathname;
  return `${base}#p=${encodeState(state)}`;
}
