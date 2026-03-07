import { WDAYS } from './constants.js';
import { load } from './storage.js';
import { emoEmoji, entryTags, escHtml } from './utils.js';

export function filterKeys(filter) {
  const d   = load();
  const now = new Date();
  return Object.keys(d).sort().reverse().filter(k => {
    if (filter === 'all') return true;
    const [ky, km, kd] = k.split('-').map(Number);
    const dt = new Date(ky, km - 1, kd);
    if (filter === 'week') {
      const diff = (new Date(now.getFullYear(), now.getMonth(), now.getDate()) - dt) / 86400000;
      return diff < 7;
    }
    return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
  });
}

export function renderHistory(filter) {
  const d    = load();
  const list = document.getElementById('histList');
  list.innerHTML = '';

  const keys = filterKeys(filter);
  if (!keys.length) {
    list.innerHTML = '<div class="empty">記録がまだありません</div>';
    return;
  }

  keys.forEach(k => {
    const entry = d[k];
    const [ky, km, kd] = k.split('-').map(Number);
    const dt    = new Date(ky, km - 1, kd);
    const label = `${ky}年${km}月${kd}日（${WDAYS[dt.getDay()]}）`;
    const tags  = entryTags(entry);
    const emos  = entry.emotions || [];
    const p0    = entry.pos?.[0] ? (typeof entry.pos[0] === 'string' ? entry.pos[0] : entry.pos[0].text) : '';
    const n0    = entry.neg?.[0] ? (typeof entry.neg[0] === 'string' ? entry.neg[0] : entry.neg[0].text) : '';

    const div = document.createElement('div');
    div.className = 'hi';
    div.dataset.key = k;

    div.innerHTML = `
      <div class="hi-date">
        <span>${escHtml(label)}</span>
        <button class="del-day-btn" data-key="${k}">削除</button>
      </div>
      <div class="hi-scores">
        <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--score)">⚡ ${entry.waku || '—'}</span>
        <span style="font-family:'DM Mono',monospace;font-size:12px;color:var(--acc)">✓ ${entry.yari || '—'}</span>
        ${entry.image ? '<span style="font-size:11px">📷</span>' : ''}
      </div>
      ${emos.length
        ? `<div class="hi-emos">${emos.map(em => `<span style="font-size:11px">${emoEmoji(em)} ${escHtml(em)}</span>`).join(' ')}</div>`
        : ''}
      ${tags.length
        ? `<div class="hi-tags">${tags.map(t => `<span class="hi-tag">${escHtml(t)}</span>`).join('')}</div>`
        : ''}
      <div class="hi-prev">
        ${p0 ? `<span class="ptag">＋</span> ${escHtml(p0)}<br>` : ''}
        ${n0 ? `<span class="ntag">－</span> ${escHtml(n0)}` : ''}
      </div>`;

    list.appendChild(div);
  });
}
