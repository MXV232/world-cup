import { useDroppable } from '@dnd-kit/core';
import { useBracket } from '../state/useBracket';
import { thirdGroups } from '../state/bracketReducer';
import { teamById } from '../data/groups';
import { flagUrl } from '../data/teams';
import type { Team } from '../data/teams';
import { useDrag } from '../state/dragContext';

export default function ThirdsTray() {
  const { state, dispatch } = useBracket();
  const { activeGroup } = useDrag();

  const groups = thirdGroups(state);
  const full = state.thirds.length >= 8;
  const eligible = activeGroup !== null && !groups.has(activeGroup) && !full;

  const { setNodeRef, isOver } = useDroppable({
    id: 'thirds-tray',
    disabled: !eligible,
    data: { tray: true },
  });

  const teams = state.thirds
    .map((id) => teamById(id))
    .filter((t): t is Team => !!t)
    .sort((a, b) => a.groupId.localeCompare(b.groupId));
  const emptyCount = Math.max(0, 8 - teams.length);

  const cls = [
    'thirds-tray',
    eligible ? 'eligible' : '',
    isOver ? 'over' : '',
    full ? 'complete' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className="thirds-bar">
      <div className="thirds-label">
        <strong>Best third-placed teams</strong>
        <span className="thirds-count">{state.thirds.length}/8</span>
        <span className="thirds-hint">
          {full
            ? 'Seeded into the Round of 32 by FIFA’s allocation table ✓'
            : 'Drag the 8 qualifying thirds here — FIFA decides which R32 slot each one fills'}
        </span>
      </div>
      <div ref={setNodeRef} className={cls}>
        {teams.map((t) => (
          <div className="third-chip" key={t.id}>
            <span className="group-tag">{t.groupId}</span>
            <img
              className="flag"
              src={flagUrl(t.code)}
              alt=""
              onError={(e) => {
                e.currentTarget.style.visibility = 'hidden';
              }}
            />
            <span className="team-name">{t.name}</span>
            <button
              className="clear"
              title="Remove from qualifying thirds"
              onClick={() => dispatch({ type: 'REMOVE_THIRD', teamId: t.id })}
            >
              ×
            </button>
          </div>
        ))}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <div className="third-chip empty" key={`empty-${i}`}>
            <span className="placeholder">3rd</span>
          </div>
        ))}
      </div>
    </section>
  );
}
