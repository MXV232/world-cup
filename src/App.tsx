import { useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { BracketProvider, useBracket } from './state/useBracket';
import { DragContext } from './state/dragContext';
import { buildShareUrl, hasShareInHash } from './state/shareCodec';
import { champion } from './state/bracketReducer';
import { GROUPS, teamById } from './data/groups';
import { R32_SEEDS, seedAcceptsGroup } from './data/bracket';
import { flagUrl } from './data/teams';
import GroupsColumn from './components/GroupsColumn';
import BracketColumn from './components/BracketColumn';
import FinalCard from './components/FinalCard';
import ThirdsTray from './components/ThirdsTray';

const LEFT_GROUPS = GROUPS.filter((g) => 'ABCDEF'.includes(g.id));
const RIGHT_GROUPS = GROUPS.filter((g) => 'GHIJKL'.includes(g.id));

function Header() {
  const { state, dispatch } = useBracket();
  const [copied, setCopied] = useState(false);
  const crowned = champion(state);

  async function share() {
    const url = buildShareUrl(state);
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this link to share your prediction:', url);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <header className="app-header">
      <div>
        <h1>
          World Cup 2026 <span className="accent">Bracket Builder</span>
        </h1>
        <p className="subtitle">
          Drag each team into one of its eligible (highlighted) Round-of-32 slots, then click a team
          to send it through to the Final.
        </p>
      </div>
      <div className="header-actions">
        <button
          className={`share-btn ${crowned ? 'ready' : ''}`}
          onClick={share}
          title="Copy a link that restores this exact prediction"
        >
          {copied ? '✓ Link copied' : 'Share prediction'}
        </button>
        <button
          className="reset-btn"
          onClick={() => {
            if (window.confirm('Reset the entire bracket?')) dispatch({ type: 'RESET' });
          }}
        >
          Reset
        </button>
      </div>
    </header>
  );
}

function SharedBanner() {
  const [visible, setVisible] = useState(() => hasShareInHash());
  // Drop the payload from the address bar once it's been loaded into state.
  useEffect(() => {
    if (visible) {
      window.history.replaceState(null, '', location.pathname + location.search);
    }
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="shared-banner">
      <span>👀 You’re viewing a shared prediction. Tweak any pick to make it your own.</span>
      <button onClick={() => setVisible(false)}>Dismiss</button>
    </div>
  );
}

function Board() {
  const { dispatch } = useBracket();
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const active = activeTeamId ? teamById(activeTeamId) : null;

  function onDragStart(e: DragStartEvent) {
    const data = e.active.data.current as { teamId?: string } | undefined;
    setActiveTeamId(data?.teamId ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveTeamId(null);
    const a = e.active.data.current as { teamId?: string } | undefined;
    const o = e.over?.data.current as
      | { matchId?: string; slot?: 0 | 1; tray?: boolean }
      | undefined;
    if (!a?.teamId) return;
    if (o?.tray) {
      dispatch({ type: 'ADD_THIRD', teamId: a.teamId });
      return;
    }
    if (o?.matchId && (o.slot === 0 || o.slot === 1)) {
      const team = teamById(a.teamId);
      const seeds = R32_SEEDS[o.matchId];
      // Belt-and-suspenders: ineligible slots are already disabled droppables.
      if (team && seeds && seedAcceptsGroup(seeds[o.slot], team.groupId)) {
        dispatch({ type: 'PLACE', matchId: o.matchId, slot: o.slot, teamId: a.teamId });
      }
    }
  }

  return (
    <DragContext.Provider value={{ activeGroup: active ? active.groupId : null }}>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <ThirdsTray />
        <div className="board">
        <GroupsColumn groups={LEFT_GROUPS} side="left" />

        <div className="knockout left">
          <BracketColumn side="L" round="R32" />
          <BracketColumn side="L" round="R16" />
          <BracketColumn side="L" round="QF" />
          <BracketColumn side="L" round="SF" />
        </div>

        <FinalCard />

        <div className="knockout right">
          <BracketColumn side="R" round="SF" />
          <BracketColumn side="R" round="QF" />
          <BracketColumn side="R" round="R16" />
          <BracketColumn side="R" round="R32" />
        </div>

        <GroupsColumn groups={RIGHT_GROUPS} side="right" />
      </div>

      <DragOverlay dropAnimation={null}>
        {active ? (
          <div className="team-row dragging overlay">
            <img className="flag" src={flagUrl(active.code)} alt="" />
            <span className="team-name">{active.name}</span>
          </div>
        ) : null}
      </DragOverlay>
      </DndContext>
    </DragContext.Provider>
  );
}

export default function App() {
  return (
    <BracketProvider>
      <SharedBanner />
      <Header />
      <Board />
    </BracketProvider>
  );
}
