import { WDAYS } from './constants.js';
import { load, save } from './storage.js';
import { emoEmoji, escHtml } from './utils.js';
import { showConfirm } from './confirm.js';

// ===== フォーカス管理 =====
let _prevFocus = null;

function openModal() {
  _prevFocus = document.activeElement;
  document.getElementById('detailModal').classList.add('show');
  // クローズボタンへフォーカスを移動
  setTimeout(() => document.getElementById('modalClose').focus(), 50);
}

export function closeDetailModal() {
  document.getElementById('detailModal').classList.remove('show');
  // モーダルを開く前の要素にフォーカスを戻す
  if (_prevFocus) { _prevFocus.focus(); _prevFocus = null; }
}

// ===== 詳細モーダル =====
export function showModal(key, entry) {
  const [ky, km, kd] = key.split('-').map(Number);
  const dt    = new Date(ky, km - 1, kd);
  const label = `${ky}年${km}月${kd}日（${WDAYS[dt.getDay()]}）`;

  function itemHtml(item) {
    const text = typeof item === 'string' ? item : item.text;
    const tags = typeof item === 'string' ? [] : (item.tags || []);
    const tagsHtml = tags.length
      ? `<div class="li-tags">${tags.map(t => `<span class="lt">${escHtml(t)}</span>`).join('')}</div>`
      : '';
    return `<li><div>${escHtml(text)}</div>${tagsHtml}</li>`;
  }

  // 画像は data:image/ で始まる場合のみ表示（XSS対策）
  const imgHtml = (entry.image && entry.image.startsWith('data:image/'))
    ? `<img src="${entry.image}" class="m-img">`
    : '';

  document.getElementById('modalContent').innerHTML = `
    <div class="mdate">${escHtml(label)}</div>
    <div style="display:flex;gap:18px;margin-bottom:12px">
      <div>
        <div style="font-family:'DM Mono',monospace;font-size:22px;color:var(--score)">${entry.waku || '—'}</div>
        <div style="font-size:10px;color:var(--muted);font-family:'DM Mono',monospace">WAKU度</div>
      </div>
      <div>
        <div style="font-family:'DM Mono',monospace;font-size:22px;color:var(--acc)">${entry.yari || '—'}</div>
        <div style="font-size:10px;color:var(--muted);font-family:'DM Mono',monospace">やり切り感</div>
      </div>
      ${entry.intensity
        ? `<div>
             <div style="font-family:'DM Mono',monospace;font-size:22px;color:var(--acc)">${entry.intensity}</div>
             <div style="font-size:10px;color:var(--muted);font-family:'DM Mono',monospace">感情強度</div>
           </div>`
        : ''}
    </div>
    ${(entry.emotions || []).length
      ? `<div style="margin-bottom:12px">
           ${entry.emotions.map(em => `<span style="font-size:13px;margin-right:8px">${emoEmoji(em)} ${escHtml(em)}</span>`).join('')}
         </div>`
      : ''}
    ${imgHtml}
    <div class="msec">
      <div class="mst plbl">＋ POSITIVE</div>
      <ul class="mlist">${(entry.pos || []).map(itemHtml).join('') || '<li><div style="color:var(--muted)">記録なし</div></li>'}</ul>
    </div>
    <div class="msec">
      <div class="mst nlbl">－ NEGATIVE</div>
      <ul class="mlist">${(entry.neg || []).map(itemHtml).join('') || '<li><div style="color:var(--muted)">記録なし</div></li>'}</ul>
    </div>
    <button class="m-del" data-key="${escHtml(key)}">🗑 この日の記録を削除</button>`;

  openModal();
}

export function showModalByKey(key) {
  const d = load();
  if (d[key]) showModal(key, d[key]);
}

// ===== 日別削除 =====
export function confirmDeleteDay(key, onDone) {
  const [ky, km, kd] = key.split('-').map(Number);
  showConfirm(
    `${ky}年${km}月${kd}日の記録を削除`,
    'この日の記録が完全に削除されます。',
    () => {
      const d = load();
      delete d[key];
      save(d);
      if (typeof onDone === 'function') onDone();
    }
  );
}
