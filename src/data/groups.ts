import type { Team } from './teams';

interface RawTeam {
  id: string;
  name: string;
  code: string;
}

// Official 2026 FIFA World Cup final draw (verified against Wikipedia & FIFA.com).
const RAW: Record<string, RawTeam[]> = {
  A: [
    { id: 'MEX', name: 'Mexico', code: 'mx' },
    { id: 'RSA', name: 'South Africa', code: 'za' },
    { id: 'KOR', name: 'South Korea', code: 'kr' },
    { id: 'CZE', name: 'Czechia', code: 'cz' },
  ],
  B: [
    { id: 'CAN', name: 'Canada', code: 'ca' },
    { id: 'BIH', name: 'Bosnia & Herzegovina', code: 'ba' },
    { id: 'QAT', name: 'Qatar', code: 'qa' },
    { id: 'SUI', name: 'Switzerland', code: 'ch' },
  ],
  C: [
    { id: 'BRA', name: 'Brazil', code: 'br' },
    { id: 'MAR', name: 'Morocco', code: 'ma' },
    { id: 'HAI', name: 'Haiti', code: 'ht' },
    { id: 'SCO', name: 'Scotland', code: 'gb-sct' },
  ],
  D: [
    { id: 'USA', name: 'United States', code: 'us' },
    { id: 'PAR', name: 'Paraguay', code: 'py' },
    { id: 'AUS', name: 'Australia', code: 'au' },
    { id: 'TUR', name: 'Türkiye', code: 'tr' },
  ],
  E: [
    { id: 'GER', name: 'Germany', code: 'de' },
    { id: 'CUW', name: 'Curaçao', code: 'cw' },
    { id: 'CIV', name: 'Ivory Coast', code: 'ci' },
    { id: 'ECU', name: 'Ecuador', code: 'ec' },
  ],
  F: [
    { id: 'NED', name: 'Netherlands', code: 'nl' },
    { id: 'JPN', name: 'Japan', code: 'jp' },
    { id: 'SWE', name: 'Sweden', code: 'se' },
    { id: 'TUN', name: 'Tunisia', code: 'tn' },
  ],
  G: [
    { id: 'BEL', name: 'Belgium', code: 'be' },
    { id: 'EGY', name: 'Egypt', code: 'eg' },
    { id: 'IRN', name: 'Iran', code: 'ir' },
    { id: 'NZL', name: 'New Zealand', code: 'nz' },
  ],
  H: [
    { id: 'ESP', name: 'Spain', code: 'es' },
    { id: 'CPV', name: 'Cape Verde', code: 'cv' },
    { id: 'KSA', name: 'Saudi Arabia', code: 'sa' },
    { id: 'URU', name: 'Uruguay', code: 'uy' },
  ],
  I: [
    { id: 'FRA', name: 'France', code: 'fr' },
    { id: 'SEN', name: 'Senegal', code: 'sn' },
    { id: 'IRQ', name: 'Iraq', code: 'iq' },
    { id: 'NOR', name: 'Norway', code: 'no' },
  ],
  J: [
    { id: 'ARG', name: 'Argentina', code: 'ar' },
    { id: 'ALG', name: 'Algeria', code: 'dz' },
    { id: 'AUT', name: 'Austria', code: 'at' },
    { id: 'JOR', name: 'Jordan', code: 'jo' },
  ],
  K: [
    { id: 'POR', name: 'Portugal', code: 'pt' },
    { id: 'COD', name: 'DR Congo', code: 'cd' },
    { id: 'UZB', name: 'Uzbekistan', code: 'uz' },
    { id: 'COL', name: 'Colombia', code: 'co' },
  ],
  L: [
    { id: 'ENG', name: 'England', code: 'gb-eng' },
    { id: 'CRO', name: 'Croatia', code: 'hr' },
    { id: 'GHA', name: 'Ghana', code: 'gh' },
    { id: 'PAN', name: 'Panama', code: 'pa' },
  ],
};

export interface Group {
  id: string;
  teams: Team[];
}

export const GROUPS: Group[] = Object.entries(RAW).map(([id, teams]) => ({
  id,
  teams: teams.map((t) => ({ ...t, groupId: id })),
}));

export const ALL_TEAMS: Team[] = GROUPS.flatMap((g) => g.teams);

const BY_ID: Record<string, Team> = Object.fromEntries(ALL_TEAMS.map((t) => [t.id, t]));

export const teamById = (id: string): Team | null => BY_ID[id] ?? null;
