import { useBracket } from '../state/useBracket';
import { champion } from '../state/bracketReducer';
import { flagUrl2x } from '../data/teams';
import MatchCard from './MatchCard';

export default function FinalCard() {
  const { state } = useBracket();
  const champ = champion(state);

  return (
    <div className="final-zone">
      <div className={`champion ${champ ? 'crowned' : ''}`}>
        <div className="trophy">🏆</div>
        {champ ? (
          <>
            <img
              className="champion-flag"
              src={flagUrl2x(champ.code)}
              alt=""
              onError={(e) => {
                e.currentTarget.style.visibility = 'hidden';
              }}
            />
            <div className="champion-name">{champ.name}</div>
            <div className="champion-label">World Champion</div>
          </>
        ) : (
          <div className="champion-placeholder">Pick the final winner</div>
        )}
      </div>

      <div className="round-title final-title">Final</div>
      <div className="match-wrap final-wrap">
        <MatchCard matchId="FINAL" />
      </div>
    </div>
  );
}
