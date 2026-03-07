import { WDAYS, EMO_COLORS } from './constants.js';
import { load } from './storage.js';
import { emoEmoji, entryTags, hexToRgb, escHtml } from './utils.js';

// ===== カレンダー状態 =====
let calYear  = new Date().getFullYear();
let calMonth = new Date().getMonth();

// ===== タブ切替 =====
export function setTab(tab, today) {
  document.getElementById('weeklyContent').style.display  = tab === 'weekly'   ? 'block' : 'none';
  document.getElementById('calendarContent').style.display = tab === 'calendar' ? 'block' : 'none';
  document.getElementById('patternContent').style.display  = tab === 'pattern'  ? 'block' : 'none';

  if (tab === 'weekly')   renderWeekly();
  if (tab === 'calendar') renderCalendar(calYear, calMonth, today);
  if (tab === 'pattern')  renderPattern();
}

// ===== 週次サマリー =====
export function renderWeekly() {
  const d   = load();
  const now = new Date();
  const nowLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const keys = Object.keys(d).filter(k => {
    const [ky, km, kd] = k.split('-').map(Number);
    const diff = (nowLocal - new Date(ky, km - 1, kd)) / 86400000;
    return diff < 7;
  }).sort();

  const c = document.getElementById('weeklyContent');
  if (!keys.length) { c.innerHTML = '<div class="empty">今週の記録がありません</div>'; return; }

  const wAvg  = (keys.reduce((s, k) => s + (d[k].waku || 0), 0) / keys.length).toFixed(1);
  const yAvg  = (keys.reduce((s, k) => s + (d[k].yari || 0), 0) / keys.length).toFixed(1);
  const pCnt  = keys.reduce((s, k) => s + (d[k].pos || []).filter(i => typeof i === 'string' ? i : i.text).length, 0);
  const nCnt  = keys.reduce((s, k) => s + (d[k].neg || []).filter(i => typeof i === 'string' ? i : i.text).length, 0);
  const total = pCnt + nCnt;
  const pPct  = total ? Math.round(pCnt / total * 100) : 50;

  // SVG折れ線グラフ
  const W = 340, H = 80, PAD = 20;
  const wakuPts = keys.map((k, i) => ({
    x: PAD + i * (W - PAD * 2) / Math.max(keys.length - 1, 1),
    y: H - PAD - (d[k].waku || 0) / 10 * (H - PAD * 2),
  }));
  const yariPts = keys.map((k, i) => ({
    x: PAD + i * (W - PAD * 2) / Math.max(keys.length - 1, 1),
    y: H - PAD - (d[k].yari || 0) / 10 * (H - PAD * 2),
  }));
  const dayLabels = keys.map(k => { const [,, kd] = k.split('-').map(Number); return kd + '日'; });

  function polyline(pts, color, dashed = false) {
    const dash = dashed ? ' stroke-dasharray="6,3"' : '';
    if (pts.length < 2) return `<circle cx="${pts[0]?.x || 0}" cy="${pts[0]?.y || 0}" r="3" fill="${color}"/>`;
    return `<polyline points="${pts.map(p => `${p.x},${p.y}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${dash}/>
      ${pts.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${color}"/>`).join('')}`;
  }

  const svgChart = `<svg class="line-chart" viewBox="0 0 ${W} ${H + 20}" xmlns="http://www.w3.org/2000/svg">
    ${[2, 4, 6, 8, 10].map(v => {
      const y = H - PAD - v / 10 * (H - PAD * 2);
      return `<line x1="${PAD}" y1="${y}" x2="${W - PAD}" y2="${y}" stroke="#2a2a3a" stroke-width="1"/>`;
    }).join('')}
    ${polyline(wakuPts, '#fbbf24')}
    ${polyline(yariPts, '#818cf8', true)}
    ${dayLabels.map((l, i) => `<text x="${wakuPts[i]?.x || 0}" y="${H + 14}" text-anchor="middle" font-size="9" fill="#64748b" font-family="DM Mono">${l}</text>`).join('')}
  </svg>`;

  // タグ集計
  const tagMap = {};
  keys.forEach(k => entryTags(d[k]).forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1; }));
  const topTags = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxTag  = topTags[0] ? topTags[0][1] : 1;

  // 感情集計
  const emoMap = {};
  keys.forEach(k => (d[k].emotions || []).forEach(em => { emoMap[em] = (emoMap[em] || 0) + 1; }));
  const topEmos = Object.entries(emoMap).sort((a, b) => b[1] - a[1]);

  c.innerHTML = `
    <div class="sg">
      <div class="sc2"><div class="sn" style="color:var(--score)">${wAvg}</div><div class="sl">平均WAKU</div></div>
      <div class="sc2"><div class="sn" style="color:var(--acc)">${yAvg}</div><div class="sl">平均やり切り</div></div>
      <div class="sc2"><div class="sn" style="color:var(--pos)">${pCnt}</div><div class="sl">POSITIVE数</div></div>
      <div class="sc2"><div class="sn" style="color:var(--neg)">${nCnt}</div><div class="sl">NEGATIVE数</div></div>
    </div>
    <div class="chart-wrap">
      <div class="chart-title">SCORE TREND</div>
      ${svgChart}
      <div style="display:flex;gap:12px;margin-top:4px">
        <span style="font-size:9px;color:var(--score);font-family:'DM Mono',monospace">— WAKU（実線）</span>
        <span style="font-size:9px;color:var(--acc);font-family:'DM Mono',monospace">- - やり切り（破線）</span>
      </div>
    </div>
    <div class="balance-wrap">
      <div class="chart-title">POSI / NEGA BALANCE</div>
      <div class="balance-bar"><div class="balance-fill" style="width:${pPct}%"></div></div>
      <div class="balance-labels">
        <span style="color:var(--pos)">＋ ${pCnt}件 (${pPct}%)</span>
        <span style="color:var(--neg)">${100 - pPct}% (${nCnt}件) －</span>
      </div>
    </div>
    ${topEmos.length ? `<div class="tib">
      <div class="sec-lbl" style="margin-bottom:10px">EMOTION LOG</div>
      ${topEmos.map(([em, n]) => `
        <div class="ti">
          <span style="width:16px;height:16px;border-radius:50%;background:${EMO_COLORS[em] || '#64748b'};display:inline-block;flex-shrink:0"></span>
          <span style="flex:1">${emoEmoji(em)} ${escHtml(em)}</span>
          <span class="tin">${n}回</span>
        </div>`).join('')}
    </div>` : ''}
    ${topTags.length ? `<div class="chart-wrap">
      <div class="chart-title">TAG BREAKDOWN</div>
      <div class="bar-chart">
        ${topTags.map(([t, n]) => `
          <div class="bc-row">
            <span class="bc-lbl">${escHtml(t)}</span>
            <div class="bc-bar-wrap"><div class="bc-bar" style="width:${Math.round(n / maxTag * 100)}%;background:var(--acc)"></div></div>
            <span class="bc-val">${n}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}
    <div style="text-align:center;padding:8px;font-size:10px;color:var(--muted);font-family:'DM Mono',monospace">${keys.length}日分 | 過去7日間</div>`;
}

// ===== カレンダー =====
export function renderCalendar(y, m, today) {
  calYear  = y;
  calMonth = m;
  const d        = load();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr = today
    ? `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
    : '';

  const prevYear  = m === 0 ? y - 1 : y;
  const prevMonth = m === 0 ? 11 : m - 1;
  const nextYear  = m === 11 ? y + 1 : y;
  const nextMonth = m === 11 ? 0 : m + 1;

  let html = `
    <div class="cal-header">
      <button class="cal-nav" data-year="${prevYear}" data-month="${prevMonth}">←</button>
      <span class="cal-title">${y}年${m + 1}月</span>
      <button class="cal-nav" data-year="${nextYear}" data-month="${nextMonth}">→</button>
    </div>
    <div class="cal-grid">
      ${WDAYS.map(w => `<div class="cal-dow">${w}</div>`).join('')}
      ${Array(firstDay).fill('<div class="cal-day empty"></div>').join('')}`;

  for (let day = 1; day <= daysInMonth; day++) {
    const km  = String(m + 1).padStart(2, '0');
    const kd  = String(day).padStart(2, '0');
    const key = `${y}-${km}-${kd}`;
    const entry   = d[key];
    const isToday = key === todayStr;
    const emos    = entry ? (entry.emotions || []) : [];
    const dotColor = emos.length ? (EMO_COLORS[emos[0]] || '#818cf8') : (entry ? '#4ade80' : 'transparent');
    const bg = entry
      ? (emos.length ? `rgba(${hexToRgb(dotColor)},.12)` : 'rgba(74,222,128,.08)')
      : '';

    html += `<div class="cal-day${isToday ? ' today' : ''}"
               style="${bg ? `background:${bg}` : ''}"
               ${entry ? `data-key="${key}"` : ''}
               title="${entry ? `WAKU:${entry.waku} やり切り:${entry.yari}` : ''}">
      <span class="cal-day-num" style="color:${entry ? 'var(--text)' : 'var(--muted)'}">${day}</span>
      <div class="cal-day-dot" style="background:${dotColor};opacity:${entry ? 1 : 0}"></div>
    </div>`;
  }

  html += `</div>
    <div class="emo-legend">
      ${Object.entries(EMO_COLORS).map(([em, c]) =>
        `<div class="el-item"><div class="el-dot" style="background:${c}"></div><span>${escHtml(em)}</span></div>`
      ).join('')}
      <div class="el-item"><div class="el-dot" style="background:var(--pos)"></div><span>記録あり</span></div>
    </div>`;

  document.getElementById('calendarContent').innerHTML = html;
}

// ===== ストップワード（パターン分析用）=====
const STOPWORDS = new Set([
  'こと', 'もの', 'ため', 'よう', 'とき', 'ところ', 'それ', 'これ', 'あれ',
  'そこ', 'ここ', 'あそこ', 'から', 'まで', 'だけ', 'など', 'ない', 'ある',
  'する', 'なる', 'くる', 'いる', 'おる', 'できる', 'という', 'ように',
  'しかし', 'でも', 'しかも', 'また', 'あと', 'さらに', 'なので', 'いつも',
]);

// ===== パターン分析 =====
export function renderPattern() {
  const d   = load();
  const c   = document.getElementById('patternContent');
  const allNeg = Object.values(d).flatMap(entry =>
    (entry.neg || [])
      .filter(i => typeof i === 'string' ? i : i.text)
      .map(i => ({
        text: typeof i === 'string' ? i : i.text,
        tags: typeof i === 'string' ? [] : (i.tags || []),
      }))
  );

  if (!allNeg.length) { c.innerHTML = '<div class="empty">ネガの記録がまだありません</div>'; return; }

  // キーワード抽出（スペース・句読点区切り、2文字以上）
  const kwMap = {};
  allNeg.forEach(item => {
    item.text.replace(/[。、！？\s]/g, ' ').split(' ')
      .filter(w => w.length >= 2 && !STOPWORDS.has(w))
      .forEach(w => { kwMap[w] = (kwMap[w] || 0) + 1; });
  });
  const topKw  = Object.entries(kwMap).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxKw  = topKw[0] ? topKw[0][1] : 1;

  // ネガタグ頻度
  const negTagMap = {};
  allNeg.forEach(item => item.tags.forEach(t => { negTagMap[t] = (negTagMap[t] || 0) + 1; }));
  const topNegTags = Object.entries(negTagMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // 月別ネガ件数
  const monthMap = {};
  Object.entries(d).forEach(([k, entry]) => {
    const [y, m] = k.split('-');
    const ym = `${y}-${m}`;
    const nc = (entry.neg || []).filter(i => typeof i === 'string' ? i : i.text).length;
    monthMap[ym] = (monthMap[ym] || 0) + nc;
  });
  const months   = Object.entries(monthMap).sort().slice(-4);
  const maxMonth = Math.max(...months.map(([, n]) => n), 1);

  // タグ×スコア相関
  const tagScoreMap = {};
  Object.entries(d).forEach(([, entry]) => {
    entryTags(entry).forEach(t => {
      if (!tagScoreMap[t]) tagScoreMap[t] = { waku: [], yari: [], cnt: 0 };
      if (entry.waku) tagScoreMap[t].waku.push(entry.waku);
      if (entry.yari) tagScoreMap[t].yari.push(entry.yari);
      tagScoreMap[t].cnt++;
    });
  });
  const corrData = Object.entries(tagScoreMap)
    .filter(([, v]) => v.cnt >= 2)
    .map(([t, v]) => ({
      tag:  t,
      cnt:  v.cnt,
      waku: v.waku.length ? (v.waku.reduce((s, x) => s + x, 0) / v.waku.length).toFixed(1) : null,
      yari: v.yari.length ? (v.yari.reduce((s, x) => s + x, 0) / v.yari.length).toFixed(1) : null,
    }))
    .sort((a, b) => parseFloat(b.waku || 0) - parseFloat(a.waku || 0))
    .slice(0, 6);

  function scoreColor(v) {
    const n = parseFloat(v);
    return n >= 7
      ? 'background:rgba(74,222,128,.15);color:#4ade80'
      : n <= 4
        ? 'background:rgba(248,113,113,.15);color:#f87171'
        : 'background:rgba(129,140,248,.15);color:#818cf8';
  }

  const corrHtml = corrData.length ? `<div class="tib" style="margin-bottom:10px">
    <div class="sec-lbl" style="margin-bottom:10px;color:var(--acc)">タグ × スコア相関</div>
    <div style="display:flex;gap:6px;margin-bottom:8px;font-size:9px;font-family:'DM Mono',monospace;color:var(--muted)">
      <span style="flex:1">タグ</span><span style="width:50px;text-align:center">WAKU</span><span style="width:50px;text-align:center">やり切り</span>
    </div>
    ${corrData.map(r => `
      <div class="corr-item">
        <span class="corr-tag">${escHtml(r.tag)} <span style="color:var(--muted);font-size:10px">(${r.cnt}日)</span></span>
        <div class="corr-scores">
          ${r.waku ? `<span class="corr-sc" style="${scoreColor(r.waku)}">${r.waku}</span>` : ''}
          ${r.yari ? `<span class="corr-sc" style="${scoreColor(r.yari)}">${r.yari}</span>` : ''}
        </div>
      </div>`).join('')}
    <div style="font-size:10px;color:var(--muted);margin-top:6px">緑=高い 紫=普通 赤=低い</div>
  </div>` : '';

  c.innerHTML = `
    ${topKw.length ? `<div class="tib">
      <div class="sec-lbl nlbl" style="margin-bottom:10px">よく出るネガキーワード</div>
      ${topKw.map(([kw, n]) => `
        <div class="pattern-item">
          <div class="pattern-kw">${escHtml(kw)}</div>
          <div class="pattern-count">${n}回登場</div>
          <div class="pattern-bar"><div class="pattern-fill" style="width:${Math.round(n / maxKw * 100)}%"></div></div>
        </div>`).join('')}
    </div>` : '<div class="empty" style="padding:20px 0">キーワードの蓄積中...<br><span style="font-size:11px">同じ言葉が2回以上出ると表示されます</span></div>'}

    ${topNegTags.length ? `<div class="tib">
      <div class="sec-lbl nlbl" style="margin-bottom:10px">ネガが多いカテゴリ</div>
      ${topNegTags.map(([t, n], i) => `
        <div class="ti">
          <span class="tin">${i + 1}</span>
          <span style="flex:1">${escHtml(t)}</span>
          <span class="tin">${n}件</span>
        </div>`).join('')}
    </div>` : ''}

    ${months.length ? `<div class="chart-wrap">
      <div class="chart-title">月別ネガ件数トレンド</div>
      <div class="bar-chart">
        ${months.map(([ym, n]) => `
          <div class="bc-row">
            <span class="bc-lbl" style="font-size:10px">${ym.slice(5)}月</span>
            <div class="bc-bar-wrap"><div class="bc-bar" style="width:${Math.round(n / maxMonth * 100)}%;background:var(--neg)"></div></div>
            <span class="bc-val">${n}</span>
          </div>`).join('')}
      </div>
    </div>` : ''}

    ${corrHtml}

    <div style="background:var(--s2);border:1px solid var(--border);border-radius:10px;padding:12px;font-size:12px;color:var(--dim);line-height:1.7;margin-top:4px">
      💡 <strong style="color:var(--text)">Obsidian + Claude Desktop</strong> と連携すると、AIがネガパターンをより深く分析できます。
    </div>`;
}
