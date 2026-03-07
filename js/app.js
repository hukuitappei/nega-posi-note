import { WDAYS, SK } from './constants.js';
import { load, save } from './storage.js';
import { getToday, ar } from './utils.js';
import {
  addItem, getItems, getEmotions, toggleEmo,
  imageState, handleImageFile, handleDrop, removeImage, showImgFromUrl,
} from './entries.js';
import { initConfirmModal, showConfirm } from './confirm.js';
import { showModal, showModalByKey, confirmDeleteDay } from './modal.js';
import { renderHistory } from './history.js';
import { setTab, renderCalendar } from './review.js';
import { exportToObsidian } from './obsidian.js';
import { exportJSON, importJSON } from './backup.js';
import { initPWA } from './pwa.js';

// ===== 今日の日付 =====
const { date: today, key: todayKey } = getToday();

document.getElementById('todayLabel').textContent =
  `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日（${WDAYS[today.getDay()]}）`;

// ===== ストリーク =====
function updateStreak() {
  const d  = load();
  let s    = 0;
  const dt = new Date(today);
  for (let i = 0; i < 366; i++) {
    const y   = dt.getFullYear();
    const m   = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    if (d[`${y}-${m}-${day}`]) { s++; dt.setDate(dt.getDate() - 1); }
    else break;
  }
  document.getElementById('streakBadge').textContent = `🔥 ${s}日連続`;
}

// ===== 相対スコアバッジ =====
function avgScore(keys, field) {
  const d    = load();
  const vals = keys.map(k => d[k]?.[field]).filter(v => v != null);
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
}

function getKeyRange(daysAgo, span) {
  const d        = load();
  const nowLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Object.keys(d).filter(k => {
    const [ky, km, kd] = k.split('-').map(Number);
    const diff = (nowLocal - new Date(ky, km - 1, kd)) / 86400000;
    return diff >= daysAgo && diff < daysAgo + span;
  });
}

function renderRelativeBadges() {
  const thisWeek  = getKeyRange(0, 7);
  const lastWeek  = getKeyRange(7, 7);
  const thisMonth = getKeyRange(0, 30);
  const lastMonth = getKeyRange(30, 30);
  const wThis = avgScore(thisWeek, 'waku'),  wLast = avgScore(lastWeek, 'waku');
  const yThis = avgScore(thisWeek, 'yari'),  yLast = avgScore(lastWeek, 'yari');
  const wmThis = avgScore(thisMonth, 'waku'), wmLast = avgScore(lastMonth, 'waku');

  if (wThis == null && yThis == null) return;
  document.getElementById('relRow').style.display = 'flex';

  function badge(cur, prev, id) {
    const el = document.getElementById(id);
    if (cur == null)  { el.innerHTML = '<span class="rel-flat">—</span>'; return; }
    if (prev == null) { el.innerHTML = `<span class="rel-flat">${cur.toFixed(1)}</span>`; return; }
    const diff = cur - prev;
    const sign = diff > 0 ? '+' : '';
    const cls  = diff > 0.2 ? 'rel-up' : diff < -0.2 ? 'rel-down' : 'rel-flat';
    el.innerHTML = `<span class="${cls}">${sign}${diff.toFixed(1)}</span>`;
  }
  badge(wThis,  wLast,  'relWaku');
  badge(yThis,  yLast,  'relYari');
  badge(wmThis, wmLast, 'relMonth');
}

// ===== リマインドバナー =====
function checkRemind() {
  const d    = load();
  const keys = Object.keys(d).sort();
  if (!keys.length) return;
  const [ly, lm, ld] = keys[keys.length - 1].split('-').map(Number);
  const nowLocal  = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysSince = (nowLocal - new Date(ly, lm - 1, ld)) / 86400000;

  // 7日以上未記録 — 週1回まで再通知
  if (daysSince >= 7) {
    const dis = localStorage.getItem('remind_inactive_dismissed');
    if (!dis || Date.now() - parseInt(dis, 10) >= 7 * 24 * 3600 * 1000) {
      document.getElementById('remindBanner').classList.add('show');
    }
    return;
  }

  // 毎週日曜（直近7日以内に記録あり） — 当日1回まで
  if (today.getDay() === 0) {
    const dis   = localStorage.getItem('remind_weekly_dismissed');
    const todayTs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    if (!dis || parseInt(dis, 10) < todayTs) {
      document.getElementById('remindBanner').classList.add('show');
    }
  }
}

function dismissRemind() {
  const d    = load();
  const keys = Object.keys(d).sort();
  const nowLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let daysSince  = Infinity;
  if (keys.length) {
    const [ly, lm, ld] = keys[keys.length - 1].split('-').map(Number);
    daysSince = (nowLocal - new Date(ly, lm - 1, ld)) / 86400000;
  }
  if (daysSince >= 7) {
    localStorage.setItem('remind_inactive_dismissed', Date.now().toString());
  } else {
    localStorage.setItem('remind_weekly_dismissed', nowLocal.getTime().toString());
  }
  document.getElementById('remindBanner').classList.remove('show');
}

// ===== 今日の画面初期化 =====
(function initToday() {
  const d = load();
  if (d[todayKey]) {
    const e = d[todayKey];
    document.getElementById('wakuSlider').value    = e.waku || 5;
    document.getElementById('wakuVal').textContent = e.waku || 5;
    document.getElementById('yariSlider').value    = e.yari || 5;
    document.getElementById('yariVal').textContent = e.yari || 5;
    document.getElementById('intensitySlider').value    = e.intensity || 5;
    document.getElementById('intensityVal').textContent = e.intensity || 5;

    (e.emotions || []).forEach(em => {
      const btn = document.querySelector(`.emo-chip[data-e="${em}"]`);
      if (btn) { btn.classList.add('on'); btn.setAttribute('aria-pressed', 'true'); }
    });

    const pa = e.pos?.length ? e.pos : [];
    const na = e.neg?.length ? e.neg : [];
    if (pa.length) pa.forEach(i => addItem('pos', typeof i === 'string' ? i : i.text, typeof i === 'string' ? [] : (i.tags || [])));
    else addItem('pos');
    if (na.length) na.forEach(i => addItem('neg', typeof i === 'string' ? i : i.text, typeof i === 'string' ? [] : (i.tags || [])));
    else addItem('neg');

    if (e.image) { imageState.dataUrl = e.image; showImgFromUrl(e.image); }
    if (e.wakuMemo) document.getElementById('wakuMemo').value = e.wakuMemo;
    if (e.yariMemo) document.getElementById('yariMemo').value = e.yariMemo;
  } else {
    addItem('pos');
    addItem('neg');
  }
  updateStreak();
  renderRelativeBadges();
  checkRemind();
})();

// ===== 保存 =====
function saveToday() {
  const pos = getItems('pos');
  const neg = getItems('neg');
  if (!pos.length && !neg.length) {
    const err = document.getElementById('valErr');
    err.classList.add('show');
    ['posBlock', 'negBlock'].forEach(id => {
      const el = document.getElementById(id);
      el.classList.add('shake');
      el.style.borderColor = 'var(--danger)';
      setTimeout(() => { el.classList.remove('shake'); el.style.borderColor = ''; }, 1500);
    });
    setTimeout(() => err.classList.remove('show'), 2000);
    return;
  }
  const d = load();
  d[todayKey] = {
    waku:      +document.getElementById('wakuSlider').value,
    yari:      +document.getElementById('yariSlider').value,
    emotions:  getEmotions(),
    intensity: +document.getElementById('intensitySlider').value,
    pos, neg,
    image:     imageState.dataUrl || null,
    wakuMemo:  document.getElementById('wakuMemo').value.trim(),
    yariMemo:  document.getElementById('yariMemo').value.trim(),
    savedAt:   new Date().toISOString(),
  };
  const saved = save(d);
  if (!saved) {
    // QuotaExceededError — ユーザーに容量不足を通知
    const errEl = document.getElementById('saveErr');
    errEl.classList.add('show');
    setTimeout(() => errEl.classList.remove('show'), 5000);
    return;
  }
  updateStreak();
  const ok = document.getElementById('saveOk');
  ok.classList.add('show');
  setTimeout(() => ok.classList.remove('show'), 2000);
}

// ===== ナビゲーション =====
let currentFilter = 'all';
let currentTab    = 'weekly';

function showScreen(name) {
  document.querySelectorAll('.scr').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('active'));
  document.getElementById('scr-' + name).classList.add('active');
  document.querySelector(`.nb[data-screen="${name}"]`).classList.add('active');
  if (name === 'history') renderHistory(currentFilter);
  if (name === 'review')  setTab(currentTab, today);
}

// ===== イベントリスナー設定 =====

// スコアスライダー
document.getElementById('wakuSlider').addEventListener('input', function () {
  document.getElementById('wakuVal').textContent = this.value;
});
document.getElementById('yariSlider').addEventListener('input', function () {
  document.getElementById('yariVal').textContent = this.value;
});
document.getElementById('intensitySlider').addEventListener('input', function () {
  document.getElementById('intensityVal').textContent = this.value;
});
document.getElementById('wakuMemo').addEventListener('input', function () { ar(this); });
document.getElementById('yariMemo').addEventListener('input', function () { ar(this); });

// 感情チップ（イベントデリゲーション）
document.getElementById('emoRow').addEventListener('click', e => {
  const chip = e.target.closest('.emo-chip');
  if (chip) {
    toggleEmo(chip);
    chip.setAttribute('aria-pressed', chip.classList.contains('on').toString());
  }
});

// エントリ追加ボタン
document.getElementById('addPosBtn').addEventListener('click', () => addItem('pos'));
document.getElementById('addNegBtn').addEventListener('click', () => addItem('neg'));

// 画像
const imgDrop = document.getElementById('imgDrop');
imgDrop.addEventListener('click',      () => document.getElementById('imgInput').click());
imgDrop.addEventListener('dragover',   e => { e.preventDefault(); imgDrop.classList.add('over'); });
imgDrop.addEventListener('dragleave',  () => imgDrop.classList.remove('over'));
imgDrop.addEventListener('drop',       handleDrop);
document.getElementById('imgInput').addEventListener('change', function () { handleImageFile(this.files[0]); });
document.getElementById('imgRemoveBtn').addEventListener('click', removeImage);

// Obsidian書き出し
document.getElementById('obsBtn').addEventListener('click', () => exportToObsidian(today, todayKey, WDAYS));

// 保存
document.getElementById('saveBtn').addEventListener('click', saveToday);

// リマインド
document.getElementById('remindDismiss').addEventListener('click', dismissRemind);

// ナビゲーション（イベントデリゲーション）
document.querySelector('.nav').addEventListener('click', e => {
  const btn = e.target.closest('.nb[data-screen]');
  if (btn) showScreen(btn.dataset.screen);
});

// 履歴フィルター
document.getElementById('filterRow').addEventListener('click', e => {
  const btn = e.target.closest('.fb[data-filter]');
  if (!btn) return;
  document.querySelectorAll('.fb').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-pressed', 'false');
  });
  btn.classList.add('active');
  btn.setAttribute('aria-pressed', 'true');
  currentFilter = btn.dataset.filter;
  renderHistory(currentFilter);
});

// 履歴リスト（イベントデリゲーション）
document.getElementById('histList').addEventListener('click', e => {
  const delBtn = e.target.closest('.del-day-btn[data-key]');
  if (delBtn) {
    e.stopPropagation();
    confirmDeleteDay(delBtn.dataset.key, () => { updateStreak(); renderHistory(currentFilter); });
    return;
  }
  const card = e.target.closest('.hi[data-key]');
  if (card) {
    const d = load();
    if (d[card.dataset.key]) showModal(card.dataset.key, d[card.dataset.key]);
  }
});

// サブタブ（週次・カレンダー・パターン）
document.getElementById('subTabs').addEventListener('click', e => {
  const btn = e.target.closest('.stab[data-tab]');
  if (!btn) return;
  document.querySelectorAll('.stab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentTab = btn.dataset.tab;
  setTab(currentTab, today);
});

// カレンダーナビ・日付クリック（イベントデリゲーション）
document.getElementById('calendarContent').addEventListener('click', e => {
  const navBtn = e.target.closest('.cal-nav[data-year]');
  if (navBtn) {
    renderCalendar(parseInt(navBtn.dataset.year), parseInt(navBtn.dataset.month), today);
    return;
  }
  const dayEl = e.target.closest('.cal-day[data-key]');
  if (dayEl) showModalByKey(dayEl.dataset.key);
});

// 詳細モーダル — 背景クリックで閉じる
document.getElementById('detailModal').addEventListener('click', e => {
  if (e.target === document.getElementById('detailModal')) {
    document.getElementById('detailModal').classList.remove('show');
  }
});
document.getElementById('modalClose').addEventListener('click', () => {
  document.getElementById('detailModal').classList.remove('show');
});

// 詳細モーダル内の削除ボタン（イベントデリゲーション）
document.getElementById('modalContent').addEventListener('click', e => {
  const delBtn = e.target.closest('.m-del[data-key]');
  if (!delBtn) return;
  document.getElementById('detailModal').classList.remove('show');
  confirmDeleteDay(delBtn.dataset.key, () => { updateStreak(); renderHistory(currentFilter); });
});

// 確認ダイアログ
initConfirmModal();

// 設定画面
document.getElementById('deleteTodayBtn').addEventListener('click', () => {
  showConfirm('今日の記録を削除', `${todayKey} の記録を削除します。`, () => {
    const d = load(); delete d[todayKey]; save(d); location.reload();
  });
});
document.getElementById('deleteAllBtn').addEventListener('click', () => {
  showConfirm('全データをリセット', 'すべての記録が完全に削除されます。', () => {
    localStorage.removeItem(SK); location.reload();
  });
});

// ===== バックアップ / リストア =====
function setBackupStatus(msg, type) {
  const el = document.getElementById('backupStatus');
  el.textContent = msg;
  el.className = `backup-status ${type}`;
}

document.getElementById('exportJsonBtn').addEventListener('click', () => {
  try {
    const count = exportJSON();
    if (count != null) setBackupStatus(`✓ ${count}日分のデータを書き出しました`, 'ok');
  } catch {
    setBackupStatus('書き出しに失敗しました', 'err');
  }
});

document.getElementById('importJsonBtn').addEventListener('click', () => {
  document.getElementById('importJsonInput').value = '';
  document.getElementById('importJsonInput').click();
});

document.getElementById('importJsonInput').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;

  // ファイル選択直後にプレビューなしで確認ダイアログを出す
  const reader = new FileReader();
  reader.onload = e => {
    let count = 0;
    try {
      const parsed = JSON.parse(e.target.result);
      count = Object.keys(parsed).length;
    } catch {
      setBackupStatus('ファイルの形式が正しくありません（JSON を確認してください）', 'err');
      return;
    }
    const existing = Object.keys(load()).length;
    showConfirm(
      'バックアップから復元',
      `${count}日分のデータが見つかりました。\n既存の${existing}日分のデータと統合します。\n同じ日付のデータはバックアップ側で上書きされます。`,
      async () => {
        try {
          const { count: n, overwritten } = await importJSON(file);
          const msg = overwritten > 0
            ? `✓ ${n}日分を復元しました（${overwritten}日は上書き）`
            : `✓ ${n}日分を復元しました`;
          setBackupStatus(msg, 'ok');
        } catch (err) {
          setBackupStatus(`復元失敗: ${err.message}`, 'err');
        }
      }
    );
  };
  reader.readAsText(file, 'utf-8');
});

// PWA
initPWA();
