import { createContext, useContext } from 'react';

/** The group ("A".."L") of the team currently being dragged, or null when idle. */
export const DragContext = createContext<{ activeGroup: string | null }>({ activeGroup: null });

export const useDrag = () => useContext(DragContext);
