import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Group } from '../data/groups';
import type { Team } from '../data/teams';
import { flagUrl } from '../data/teams';
import { useBracket } from '../state/useBracket';
import { placedTeamIds, type GroupScores } from '../state/bracketReducer';

// All 6 pair indices for 4 teams: (0,1),(0,2),(0,3),(1,2),(1,3),(2,3)
const PAIRS: [number, number][] = [];
for (let i = 0; i < 4; i++)
  for (let j = i + 1; j < 4; j++)
    PAIRS.push([i, j]);

interface Standing {
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

function computeStandings(group: Group, groupScores: GroupScores): Standing[] {
  const stats = new Map<string, Standing>(
    group.teams.map((t) => [t.id, { team: t, pts: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, played: 0 }]),
  );

  for (const [i, j] of PAIRS) {
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

function TeamRow({
  teamId,
  name,
  code,
  placed,
  pts,
  played,
}: {
  teamId: string;
  name: string;
  code: string;
  placed: boolean;
  pts: number;
  played: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `team:${teamId}`,
    data: { teamId },
    disabled: placed,
  });

  return (
    <div
      ref={setNodeRef}
      className={`team-row ${placed ? 'placed' : ''} ${isDragging ? 'dragging' : ''}`}
      {...(placed ? {} : listeners)}
      {...attributes}
    >
      <img
        className="flag"
        src={flagUrl(code)}
        alt=""
        onError={(e) => {
          e.currentTarget.style.visibility = 'hidden';
        }}
      />
      <span className="team-name">{name}</span>
      {placed && <span className="placed-check">✓</span>}
      {played > 0 && <span className="team-pts">{pts}</span>}
    </div>
  );
}

function MatchesSection({ group, standings }: { group: Group; standings: Standing[] }) {
  const { state, dispatch } = useBracket();
  const teams = group.teams;
  const hasAnyScore = standings.some((s) => s.played > 0);

  function handleScore(key: string, slot: 0 | 1, raw: string) {
    const current = state.groupScores[key] ?? [null, null];
    const val = raw === '' ? null : Math.max(0, Math.floor(Number(raw)));
    const next: [number | null, number | null] = [current[0], current[1]];
    next[slot] = Number.isNaN(val as number) ? null : val;
    dispatch({ type: 'SET_GROUP_SCORE', matchKey: key, scores: next });
  }

  return (
    <div className="group-matches">
      {hasAnyScore && (
        <div className="standings-table">
          <div className="standings-header">
            <span className="st-team" />
            <span className="st-num">Pts</span>
            <span className="st-num">GD</span>
            <span className="st-num">GF</span>
          </div>
          {standings.map((s, pos) => (
            <div key={s.team.id} className={`standings-row ${pos < 2 ? 'qualify' : pos === 2 ? 'maybe' : ''}`}>
              <span className="st-pos">{pos + 1}</span>
              <img className="st-flag" src={flagUrl(s.team.code)} alt="" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
              <span className="st-team">{s.team.id}</span>
              <span className="st-num st-pts">{s.pts}</span>
              <span className="st-num">{s.gd > 0 ? `+${s.gd}` : s.gd}</span>
              <span className="st-num">{s.gf}</span>
            </div>
          ))}
        </div>
      )}

      <div className="matches-list">
        {PAIRS.map(([i, j]) => {
          const key = `${group.id}-${i}${j}`;
          const scores = state.groupScores[key] ?? [null, null];
          return (
            <div key={key} className="group-match-row">
              <span className="gm-team gm-home">{teams[i].id}</span>
              <input
                className="score-input"
                type="number"
                min="0"
                max="99"
                value={scores[0] ?? ''}
                onChange={(e) => handleScore(key, 0, e.target.value)}
              />
              <span className="score-sep">–</span>
              <input
                className="score-input"
                type="number"
                min="0"
                max="99"
                value={scores[1] ?? ''}
                onChange={(e) => handleScore(key, 1, e.target.value)}
              />
              <span className="gm-team gm-away">{teams[j].id}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GroupCard({ group }: { group: Group }) {
  const { state } = useBracket();
  const placed = placedTeamIds(state);
  const [showMatches, setShowMatches] = useState(false);

  const standings = computeStandings(group, state.groupScores);
  const ptsByTeam = new Map(standings.map((s) => [s.team.id, s]));

  return (
    <div className="group-card">
      <div className="group-title">
        Group {group.id}
        <button className="scores-toggle" onClick={() => setShowMatches((v) => !v)}>
          {showMatches ? 'hide' : 'scores'}
        </button>
      </div>
      {group.teams.map((t) => {
        const s = ptsByTeam.get(t.id);
        return (
          <TeamRow
            key={t.id}
            teamId={t.id}
            name={t.name}
            code={t.code}
            placed={placed.has(t.id)}
            pts={s?.pts ?? 0}
            played={s?.played ?? 0}
          />
        );
      })}
      {showMatches && <MatchesSection group={group} standings={standings} />}
    </div>
  );
}
