import { useBracket } from '../state/useBracket';
import { resolvedSlots } from '../state/bracketReducer';
import { MATCH_BY_ID, R32_SEEDS } from '../data/bracket';
import Slot from './Slot';

export default function MatchCard({ matchId }: { matchId: string }) {
  const { state, dispatch } = useBracket();
  const def = MATCH_BY_ID[matchId];
  const isR32 = def.round === 'R32';
  const seeds = isR32 ? R32_SEEDS[matchId] : undefined;
  const slots = resolvedSlots(state, matchId);
  const winner = state.winners[matchId];
  const bothFilled = !!slots[0] && !!slots[1];

  return (
    <div className={`match match-${def.round.toLowerCase()}`}>
      {([0, 1] as const).map((slot) => (
        <Slot
          key={slot}
          matchId={matchId}
          slot={slot}
          team={slots[slot]}
          isR32={isR32}
          seed={seeds ? seeds[slot] : undefined}
          isWinner={winner === slot}
          canPick={bothFilled && !!slots[slot]}
          onPick={() => dispatch({ type: 'PICK', matchId, slot })}
          onClear={() => dispatch({ type: 'CLEAR_SLOT', matchId, slot })}
        />
      ))}
    </div>
  );
}
