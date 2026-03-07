import { load, save } from './storage.js';

// ===== JSON バックアップ書き出し =====
export function exportJSON() {
  const data = load();
  const count = Object.keys(data).length;
  if (!count) {
    alert('書き出せるデータがありません。');
    return;
  }

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);

  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const filename = `daily-log-backup-${ymd}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  return count; // 呼び出し元がメッセージ表示に使う
}

// ===== JSON バックアップ復元 =====

/**
 * JSON ファイルを読み込んで既存データに統合する。
 * 同じ日付キーがある場合はインポート側を優先する（上書き）。
 *
 * @param {File} file - ユーザーが選択した .json ファイル
 * @returns {Promise<{count: number, merged: number}>}
 *   count  = インポートした日数
 *   merged = 既存データと重複した日数（上書きした件数）
 */
export function importJSON(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error('ファイルが選択されていません')); return; }

    const reader = new FileReader();

    reader.onload = e => {
      try {
        const imported = JSON.parse(e.target.result);

        // ---- バリデーション ----
        if (typeof imported !== 'object' || Array.isArray(imported) || imported === null) {
          throw new Error('ファイルの形式が正しくありません（オブジェクトが必要です）。');
        }
        const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
        const badKeys = Object.keys(imported).filter(k => !DATE_RE.test(k));
        if (badKeys.length) {
          throw new Error(`無効なキーが含まれています: ${badKeys.slice(0, 3).join(', ')}…`);
        }

        // ---- マージ ----
        const existing = load();
        const overwritten = Object.keys(imported).filter(k => k in existing).length;
        const merged = { ...existing, ...imported }; // インポート優先

        const ok = save(merged);
        if (!ok) throw new Error('ストレージ容量が不足しています。古いデータを削除してから再試行してください。');

        resolve({ count: Object.keys(imported).length, overwritten });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました。'));
    reader.readAsText(file, 'utf-8');
  });
}
