import { matchesFor, ROUND_LABELS, type Round, type Side } from '../data/bracket';
import MatchCard from './MatchCard';

interface Props {
  side: Side;
  round: Exclude<Round, 'FINAL'>;
}

export default function BracketColumn({ side, round }: Props) {
  const matches = matchesFor(side, round);
  return (
    <div className={`round round-${round.toLowerCase()} side-${side.toLowerCase()}`}>
      <div className="round-title">{ROUND_LABELS[round]}</div>
      <div className="round-matches">
        {matches.map((m) => (
          <div className="match-wrap" key={m.id}>
            <MatchCard matchId={m.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
