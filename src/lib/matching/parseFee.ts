/**
 * 案件の fee テキスト（例: "~200万円", "100~150万円/月"）から数値レンジを抽出
 */
export function parseFee(feeText: string | null): {
  min: number | null;
  max: number | null;
} {
  if (!feeText) return { min: null, max: null };

  // 数字を抽出
  const matches = feeText.match(/(\d+)/g);
  if (!matches) return { min: null, max: null };

  const nums = matches.map(Number);

  if (nums.length === 1) {
    // "~200万円" → max=200
    if (feeText.startsWith("~") || feeText.startsWith("〜") || feeText.startsWith("～")) {
      return { min: null, max: nums[0] };
    }
    // "200万円~" → min=200
    if (feeText.includes("~") || feeText.includes("〜") || feeText.includes("～")) {
      return { min: nums[0], max: null };
    }
    // "200万円" → exact
    return { min: nums[0], max: nums[0] };
  }

  // "100~150万円" → min=100, max=150
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

/**
 * 報酬テキストの数値を一律減額して表示用に変換
 * 例: adjustFee("100~150万円/月", 30) → "70~120万円/月"
 * 減額後に0以下になる場合は省略
 */
export function adjustFee(feeText: string | null, reduction: number): string | null {
  if (!feeText) return null;

  const result = feeText.replace(/(\d+)/g, (match) => {
    const adjusted = Number(match) - reduction;
    return String(Math.max(adjusted, 0));
  });

  return result;
}

/**
 * 稼働率テキスト（例: "100%", "60~80%"）から数値を抽出 (0.0 - 1.0)
 */
export function parseOccupancy(text: string | null): {
  min: number | null;
  max: number | null;
} {
  if (!text) return { min: null, max: null };

  const matches = text.match(/(\d+)/g);
  if (!matches) return { min: null, max: null };

  const nums = matches.map((n) => parseInt(n) / 100);

  if (nums.length === 1) {
    return { min: nums[0], max: nums[0] };
  }

  return { min: Math.min(...nums), max: Math.max(...nums) };
}
