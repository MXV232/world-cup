import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { Group } from '../data/groups';
import { flagUrl } from '../data/teams';
import { useBracket } from '../state/useBracket';
import { placedTeamIds, computeGroupStandings, GROUP_PAIRS, type Standing } from '../state/bracketReducer';

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
        {GROUP_PAIRS.map(([i, j]) => {
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

  const standings = computeGroupStandings(group, state.groupScores);
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
