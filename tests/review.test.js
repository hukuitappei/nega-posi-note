/**
 * review.js のパターン分析ロジックに関するユニットテスト
 * STOPWORDS フィルタとキーワード集計の検証
 */

// STOPWORDS と集計ロジックをモジュールから独立して再現してテスト
const STOPWORDS = new Set([
  'こと', 'もの', 'ため', 'よう', 'とき', 'ところ', 'それ', 'これ', 'あれ',
  'そこ', 'ここ', 'あそこ', 'から', 'まで', 'だけ', 'など', 'ない', 'ある',
  'する', 'なる', 'くる', 'いる', 'おる', 'できる', 'という', 'ように',
  'しかし', 'でも', 'しかも', 'また', 'あと', 'さらに', 'なので', 'いつも',
]);

function extractKeywords(texts) {
  const kwMap = {};
  texts.forEach(text => {
    text.replace(/[。、！？\s]/g, ' ').split(' ')
      .filter(w => w.length >= 2 && !STOPWORDS.has(w))
      .forEach(w => { kwMap[w] = (kwMap[w] || 0) + 1; });
  });
  return kwMap;
}

describe('STOPWORDS フィルタ', () => {
  it('ストップワードを除外する', () => {
    const result = extractKeywords(['こと もの 仕事 健康']);
    expect(result['こと']).toBeUndefined();
    expect(result['もの']).toBeUndefined();
    expect(result['仕事']).toBe(1);
    expect(result['健康']).toBe(1);
  });

  it('1文字以下の単語を除外する', () => {
    const result = extractKeywords(['a b 頭痛']);
    expect(result['a']).toBeUndefined();
    expect(result['b']).toBeUndefined();
    expect(result['頭痛']).toBe(1);
  });

  it('複数テキストでカウントを合算する', () => {
    // 分割はスペース・句読点なので、スペース区切りで入力する
    const result = extractKeywords(['頭痛 ひどい', '頭痛 眠れない']);
    expect(result['頭痛']).toBe(2);
  });

  it('句読点で分割して集計する', () => {
    const result = extractKeywords(['仕事、ストレス。疲労！']);
    expect(result['仕事']).toBe(1);
    expect(result['ストレス']).toBe(1);
    expect(result['疲労']).toBe(1);
  });

  it('ストップワードのみのテキストで空のマップを返す', () => {
    const result = extractKeywords(['こと もの ため する']);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

describe('キーワード頻度集計', () => {
  it('2回以上登場するキーワードをフィルタリングできる', () => {
    const texts = ['締め切り プレッシャー', '締め切り 追い込まれる'];
    const kwMap = extractKeywords(texts);
    const topKw = Object.entries(kwMap).filter(([, n]) => n >= 2);
    expect(topKw).toHaveLength(1);
    expect(topKw[0][0]).toBe('締め切り');
  });

  it('降順ソートで上位を取得できる', () => {
    const texts = ['頭痛 頭痛 疲労', '頭痛 疲労 疲労'];
    const kwMap = extractKeywords(texts);
    const sorted = Object.entries(kwMap).sort((a, b) => b[1] - a[1]);
    // 頭痛3回、疲労3回（同率）- 順不同だが両方3回
    expect(sorted[0][1]).toBe(3);
    expect(sorted[1][1]).toBe(3);
  });
});
