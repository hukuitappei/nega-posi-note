import { EMO_EMOJI } from './constants.js';

export function getToday() {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return { date: n, key: `${y}-${m}-${d}` };
}

export function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

/** EMO_EMOJI は constants.js で一元管理 */
export function emoEmoji(e) {
  return EMO_EMOJI[e] || '•';
}

export function entryTags(entry) {
  return [...new Set(
    [...(entry.pos || []), ...(entry.neg || [])].flatMap(i =>
      typeof i === 'string' ? [] : (i.tags || [])
    )
  )];
}

/** textarea の高さを内容に合わせる */
export function ar(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

/** HTML エスケープ（XSS対策） */
export function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
