/**
 * storage.js のユニットテスト
 * - load() / save() の基本動作
 * - QuotaExceededError 処理
 * - in-memory キャッシュ動作
 */

// jsdom では localStorage がグローバルに存在するためそのまま使用

// モジュールキャッシュをリセットするため dynamic import + vi.resetModules を使用
beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe('load()', () => {
  it('空の localStorage のとき {} を返す', async () => {
    const { load } = await import('../js/storage.js');
    expect(load()).toEqual({});
  });

  it('保存済みデータを JSON.parse して返す', async () => {
    localStorage.setItem('daily_log_v3', JSON.stringify({ '2024-01-01': { waku: 8 } }));
    const { load } = await import('../js/storage.js');
    expect(load()['2024-01-01'].waku).toBe(8);
  });

  it('不正な JSON のとき {} を返す', async () => {
    localStorage.setItem('daily_log_v3', 'INVALID_JSON');
    const { load } = await import('../js/storage.js');
    expect(load()).toEqual({});
  });

  it('2回目以降はキャッシュを返す（JSON.parse が再実行されない）', async () => {
    localStorage.setItem('daily_log_v3', JSON.stringify({ a: 1 }));
    const { load } = await import('../js/storage.js');
    const first  = load();
    const second = load();
    expect(first).toBe(second); // 同一参照
  });
});

describe('save()', () => {
  it('データを localStorage に保存して true を返す', async () => {
    const { save } = await import('../js/storage.js');
    const data = { '2024-02-01': { waku: 7 } };
    expect(save(data)).toBe(true);
    expect(JSON.parse(localStorage.getItem('daily_log_v3'))).toEqual(data);
  });

  it('save 後に load() がキャッシュを返す', async () => {
    const { load, save } = await import('../js/storage.js');
    const data = { x: 1 };
    save(data);
    expect(load()).toEqual(data);
  });

  it('QuotaExceededError のとき false を返す', async () => {
    const { save } = await import('../js/storage.js');
    // jsdom では Storage.prototype をモックする
    vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });
    expect(save({ big: 'data' })).toBe(false);
    vi.restoreAllMocks();
  });
});
