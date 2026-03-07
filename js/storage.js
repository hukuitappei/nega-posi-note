import { SK } from './constants.js';

/** レンダリング中の重複 JSON.parse を防ぐインメモリキャッシュ */
let _cache = null;

export function load() {
  if (_cache !== null) return _cache;
  try { _cache = JSON.parse(localStorage.getItem(SK) || '{}'); }
  catch { _cache = {}; }
  return _cache;
}

/**
 * データを保存する。保存後キャッシュを更新する。
 * @returns {true}  成功
 * @returns {false} localStorage 容量超過（QuotaExceededError）
 * @throws  それ以外の予期しないエラー
 */
export function save(data) {
  try {
    localStorage.setItem(SK, JSON.stringify(data));
    _cache = data; // キャッシュを最新状態に同期
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22) {
      return false;
    }
    throw e;
  }
}
