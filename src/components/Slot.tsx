import { useDroppable } from '@dnd-kit/core';
import type { Team } from '../data/teams';
import { flagUrl } from '../data/teams';
import { type Seed, seedAcceptsGroup, seedLabel, seedTitle } from '../data/bracket';
import { useDrag } from '../state/dragContext';

interface Props {
  matchId: string;
  slot: 0 | 1;
  team: Team | null;
  isR32: boolean;
  seed?: Seed;
  isWinner: boolean;
  canPick: boolean;
  onPick: () => void;
  onClear: () => void;
}

export default function Slot({
  matchId,
  slot,
  team,
  isR32,
  seed,
  isWinner,
  canPick,
  onPick,
  onClear,
}: Props) {
  const { activeGroup } = useDrag();
  const dragging = activeGroup !== null;
  // Third-place slots are filled automatically from the thirds tray (FIFA table),
  // so they never accept drops directly.
  const isThird = seed?.kind === 'third';
  const droppableHere = isR32 && !isThird;
  const eligible = droppableHere && !!seed && dragging && seedAcceptsGroup(seed, activeGroup);

  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${matchId}:${slot}`,
    disabled: !droppableHere || (dragging && !eligible),
    data: { matchId, slot },
  });

  const className = [
    'slot',
    team ? 'filled' : 'empty',
    isThird ? 'auto' : '',
    isWinner ? 'winner' : '',
    isOver ? 'over' : '',
    eligible ? 'eligible' : '',
    dragging && droppableHere && !eligible && !team ? 'dim' : '',
    canPick ? 'pickable' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={droppableHere ? setNodeRef : undefined}
      className={className}
      onClick={() => {
        if (canPick) onPick();
      }}
    >
      {team ? (
        <>
          <img
            className="flag"
            src={flagUrl(team.code)}
            alt=""
            onError={(e) => {
              e.currentTarget.style.visibility = 'hidden';
            }}
          />
          <span className="team-name">{team.name}</span>
          {isR32 && (
            <button
              className="clear"
              title="Remove team"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
            >
              ×
            </button>
          )}
        </>
      ) : (
        <span className="placeholder" title={seed ? seedTitle(seed) : undefined}>
          {isR32 && seed ? seedLabel(seed) : ''}
        </span>
      )}
    </div>
  );
}
