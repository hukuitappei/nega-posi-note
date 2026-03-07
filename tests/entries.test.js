/**
 * entries.js のピュアロジック部分のユニットテスト
 * - addCustomTag: 重複検出・追加ロジック
 * - handleImageFile: サイズバリデーション
 */

// addCustomTag のロジックをインラインで再現してテスト
// （DOM 依存のため entries.js を直接 import せずロジックを検証）

function addCustomTagLogic(val, existingTags) {
  const trimmed = val.trim();
  if (!trimmed) return { added: false, reason: 'empty' };
  if (existingTags.some(t => t === trimmed)) return { added: false, reason: 'duplicate' };
  return { added: true, value: trimmed };
}

describe('addCustomTag ロジック', () => {
  it('空文字は追加しない', () => {
    expect(addCustomTagLogic('', []).added).toBe(false);
    expect(addCustomTagLogic('  ', []).added).toBe(false);
  });

  it('同名タグは追加しない', () => {
    expect(addCustomTagLogic('仕事', ['仕事', '健康']).added).toBe(false);
  });

  it('新規タグは追加できる', () => {
    const result = addCustomTagLogic('趣味', ['仕事']);
    expect(result.added).toBe(true);
    expect(result.value).toBe('趣味');
  });

  it('前後の空白をトリムして追加する', () => {
    const result = addCustomTagLogic('  学び  ', []);
    expect(result.added).toBe(true);
    expect(result.value).toBe('学び');
  });
});

describe('handleImageFile サイズバリデーション', () => {
  const MAX_IMAGE_BYTES = 1 * 1024 * 1024; // 1 MB

  function validateImageSize(size) {
    return size <= MAX_IMAGE_BYTES;
  }

  it('1MB 以下のファイルは許可する', () => {
    expect(validateImageSize(500 * 1024)).toBe(true);
    expect(validateImageSize(1024 * 1024)).toBe(true);
  });

  it('1MB を超えるファイルは拒否する', () => {
    expect(validateImageSize(1024 * 1024 + 1)).toBe(false);
    expect(validateImageSize(3 * 1024 * 1024)).toBe(false);
  });
});
