import type { Group } from '../data/groups';
import GroupCard from './GroupCard';

export default function GroupsColumn({ groups, side }: { groups: Group[]; side: 'left' | 'right' }) {
  return (
    <div className={`groups-column ${side}`}>
      {groups.map((g) => (
        <GroupCard key={g.id} group={g} />
      ))}
    </div>
  );
}
