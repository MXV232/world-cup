import { useDraggable } from '@dnd-kit/core';
import type { Group } from '../data/groups';
import { flagUrl } from '../data/teams';
import { useBracket } from '../state/useBracket';
import { placedTeamIds } from '../state/bracketReducer';

function TeamRow({
  teamId,
  name,
  code,
  placed,
}: {
  teamId: string;
  name: string;
  code: string;
  placed: boolean;
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
    </div>
  );
}

export default function GroupCard({ group }: { group: Group }) {
  const { state } = useBracket();
  const placed = placedTeamIds(state);
  return (
    <div className="group-card">
      <div className="group-title">Group {group.id}</div>
      {group.teams.map((t) => (
        <TeamRow key={t.id} teamId={t.id} name={t.name} code={t.code} placed={placed.has(t.id)} />
      ))}
    </div>
  );
}
