import { getItems, getEmotions } from './entries.js';

export function exportToObsidian(today, todayKey, WDAYS) {
  const pos = getItems('pos');
  const neg = getItems('neg');
  if (!pos.length && !neg.length) {
    alert('ポジかネガを最低1つ入力してください');
    return;
  }

  const waku      = document.getElementById('wakuSlider').value;
  const yari      = document.getElementById('yariSlider').value;
  const intensity = document.getElementById('intensitySlider').value;
  const emos      = getEmotions();
  const allTags   = [...new Set([...pos.flatMap(i => i.tags), ...neg.flatMap(i => i.tags)])];

  const md = `---
date: ${todayKey}
weekday: ${WDAYS[today.getDay()]}
waku: ${waku}
yari: ${yari}
emotions: [${emos.join(', ')}]
intensity: ${intensity}
tags: [daily-log${allTags.map(t => `, ${t}`).join('')}]
---

# ${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日（${WDAYS[today.getDay()]}）

## スコア
| WAKU度 | やり切り感 | 感情強度 |
|--------|-----------|---------|
| ${waku}/10 | ${yari}/10 | ${intensity}/10 |

## スコアメモ
- WAKU: ${document.getElementById('wakuMemo').value.trim() || '（未記入）'}
- やり切り: ${document.getElementById('yariMemo').value.trim() || '（未記入）'}

## 今日の感情
${emos.length ? emos.join(' / ') : '未記録'}

## ✅ ポジティブ
${pos.length ? pos.map(i => `- ${i.text}${i.tags.length ? ' #' + i.tags.join(' #') : ''}`).join('\n') : '- （記録なし）'}

## 😔 ネガティブ
${neg.length ? neg.map(i => `- ${i.text}${i.tags.length ? ' #' + i.tags.join(' #') : ''}`).join('\n') : '- （記録なし）'}

## 📝 メモ


---
*exported from Daily Log PWA v3*
`;

  const blob = new Blob([md], { type: 'text/markdown' });
  const url  = URL.createObjectURL(blob);
  const fn   = `${todayKey}.md`;
  const a    = document.createElement('a');
  a.href = url; a.download = fn; a.click();
  URL.revokeObjectURL(url);

  document.getElementById('exportFilename').textContent = fn;
  document.getElementById('exportHint').classList.add('show');
}
