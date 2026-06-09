export interface Team {
  /** unique id, e.g. "MEX" */
  id: string;
  name: string;
  /** flagcdn slug (ISO-3166-1 alpha-2, or a subdivision slug like "gb-eng") */
  code: string;
  /** owning group id, "A".."L" */
  groupId: string;
}

export const flagUrl = (code: string) => `https://flagcdn.com/w40/${code}.png`;
export const flagUrl2x = (code: string) => `https://flagcdn.com/w160/${code}.png`;
