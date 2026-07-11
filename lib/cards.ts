export type CardContent = { text: string; reference?: string };
export type CardPosition = 'centered' | 'bottom';
export type CardThemeKey = 'cream' | 'terracotta' | 'dusk' | 'charcoal';

export interface CardTheme {
  key: CardThemeKey;
  label: string;
  gradient: [string, string]; // top -> bottom
  barColor: string;           // top accent bar
  textColor: string;          // verse text
  refColor: string;           // reference line
  wordmarkColor: string;      // SermonMate wordmark
}

// Card-specific design constants (approved in brainstorming mockups). These are a
// distinct visual surface from the in-app theme, so colors are defined explicitly here.
export const CARD_THEMES: CardTheme[] = [
  { key: 'cream',      label: 'Cream',      gradient: ['#F4EFE6', '#EBE1D2'], barColor: '#B0532F', textColor: '#2E2A26', refColor: '#B0532F', wordmarkColor: '#A08B76' },
  { key: 'terracotta', label: 'Terracotta', gradient: ['#C0623B', '#9E4526'], barColor: '#F4EFE6', textColor: '#FBF3E8', refColor: '#F0C9AE', wordmarkColor: '#F0D5C2' },
  { key: 'dusk',       label: 'Dusk',       gradient: ['#4A5B84', '#2E3350'], barColor: '#E7C98B', textColor: '#F2EFE8', refColor: '#E7C98B', wordmarkColor: '#C9CBDD' },
  { key: 'charcoal',   label: 'Charcoal',   gradient: ['#2B2724', '#171412'], barColor: '#C79A4B', textColor: '#EFE9DF', refColor: '#C79A4B', wordmarkColor: '#8F857A' },
];

// Best-effort parse of a reflection's verse string into text + optional reference.
// Recognizes a trailing "(Book c:v)" or a dash-separated "... — Book c:v" tail.
export function splitVerseString(raw: string): CardContent {
  const s = (raw ?? '').trim();
  const strip = (t: string) => t.trim().replace(/^["""']+|["""']+$/g, '').trim();

  const paren = s.match(/^(.*?)\s*\(([^()]*\d+:\d+[^()]*)\)\s*$/);
  if (paren) return { text: strip(paren[1]), reference: paren[2].trim() };

  const dash =
    s.match(/^(.*\S)\s*[—–]\s*([^—–]*\d+:\d+[^—–]*)$/) ||
    s.match(/^(.*\S)\s+-\s+([^-]*\d+:\d+[^-]*)$/);
  if (dash) return { text: strip(dash[1]), reference: dash[2].trim() };

  return { text: strip(s) };
}
