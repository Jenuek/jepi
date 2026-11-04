// Times of day as minutes from midnight, and how they are written in the app.

/** 570 → "09:30" (kept within 00:00–24:00) */
export const fmt = (m: number): string => {
  m = Math.max(0, Math.min(1440, Math.round(m)));
  const h = Math.floor(m / 60), mm = m % 60;
  return String(h).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
};

/** "9:30" / "09:30" → 570, anything else → null */
export const parse = (s: unknown): number | null => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim());
  return m ? (+m[1]) * 60 + (+m[2]) : null;
};

/** 90 → "1시간 30분", 45 → "45분" */
export const durTxt = (m: number): string => (m >= 60 ? `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ''}` : `${m}분`);
