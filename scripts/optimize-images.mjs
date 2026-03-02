/**
 * 画像最適化スクリプト
 * Adobe Stock画像をリネーム＆圧縮（高画質維持、ファイルサイズ軽量化）
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";

const IMAGES_DIR = "/Users/sawamasumi/claude-work/PERSONA/persona/public/images";

// 元ファイル名 → 新ファイル名のマッピング
const IMAGE_MAP = [
  ["AdobeStock_384921337 (4).jpeg", "hero_consultant.jpg"],       // スーツ男性 → ヒーロー
  ["AdobeStock_310026518_Preview.jpeg", "team_meeting.jpg"],       // チームミーティング → 企業向けヒーロー
  ["AdobeStock_260429911 (4).jpeg", "brainstorm.jpg"],             // ブレスト付箋 → 専門分野
  ["AdobeStock_680803741 (2).jpeg", "data_analysis.jpg"],          // データ分析 → 導入事例
  ["AdobeStock_1016538670 (2).jpeg", "digital_flow.jpg"],          // デジタルデータ → AI/DX
  ["AdobeStock_516873359 (2).jpeg", "freelance_cafe.jpg"],         // カフェPC → フリーランスライフ
  ["AdobeStock_367443580 (3).jpeg", "team_success.jpg"],           // 笑顔チーム → 強み/成功
  ["AdobeStock_649097319 (3).jpeg", "consultant_woman.jpg"],       // 女性コワーキング → CTA
  ["AdobeStock_613428157 (9).jpeg", "business_meeting.jpg"],       // 名刺交換 → コンタクト
  ["AdobeStock_681178472 (1).jpeg", "remote_work.jpg"],            // リモートワーク → サポート
  ["AdobeStock_407968987 (2).jpeg", "team_analytics.jpg"],         // 俯瞰データ → 業界
  ["AdobeStock_543175892 (2).jpeg", "urban_professional.jpg"],     // 自転車 → ライフスタイル
  ["AdobeStock_1174166957 (1).jpeg", "coworking_office.jpg"],      // コワーキング → About
  ["AdobeStock_882066998 (2).jpeg", "creative_office.jpg"],        // プロジェクトボード → ワークスペース
];

async function optimizeImage(srcPath, dstPath) {
  const metadata = await sharp(srcPath).metadata();
  const maxWidth = 1920;
  const needsResize = metadata.width > maxWidth;

  let pipeline = sharp(srcPath);

  if (needsResize) {
    pipeline = pipeline.resize(maxWidth, null, {
      withoutEnlargement: true,
      fit: "inside",
    });
  }

  await pipeline
    .jpeg({ quality: 82, progressive: true, mozjpeg: true })
    .toFile(dstPath);

  const srcStat = fs.statSync(srcPath);
  const dstStat = fs.statSync(dstPath);
  const reduction = ((1 - dstStat.size / srcStat.size) * 100).toFixed(1);

  console.log(
    `✓ ${path.basename(dstPath)} — ${(srcStat.size / 1024 / 1024).toFixed(1)}MB → ${(dstStat.size / 1024).toFixed(0)}KB (${reduction}% smaller)`
  );
}

async function main() {
  console.log("=== 画像最適化開始 ===\n");

  for (const [src, dst] of IMAGE_MAP) {
    const srcPath = path.join(IMAGES_DIR, src);
    const dstPath = path.join(IMAGES_DIR, dst);

    if (!fs.existsSync(srcPath)) {
      console.log(`⚠ SKIP: ${src} not found`);
      continue;
    }

    await optimizeImage(srcPath, dstPath);
  }

  // Blog thumbnails — compress in place (already reasonably sized, just optimize)
  const blogDir = path.join(IMAGES_DIR, "blog");
  if (fs.existsSync(blogDir)) {
    const thumbs = fs.readdirSync(blogDir).filter((f) => f.endsWith(".png"));
    let totalBefore = 0;
    let totalAfter = 0;

    for (const thumb of thumbs) {
      const thumbPath = path.join(blogDir, thumb);
      const webpPath = thumbPath.replace(".png", ".webp");
      const stat = fs.statSync(thumbPath);
      totalBefore += stat.size;

      await sharp(thumbPath)
        .resize(800, null, { withoutEnlargement: true, fit: "inside" })
        .webp({ quality: 80 })
        .toFile(webpPath);

      const newStat = fs.statSync(webpPath);
      totalAfter += newStat.size;
    }

    console.log(
      `\n✓ Blog thumbnails: ${thumbs.length} files — ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB`
    );
  }

  // Clean up original Adobe Stock files
  console.log("\n=== 元ファイル削除 ===");
  for (const [src] of IMAGE_MAP) {
    const srcPath = path.join(IMAGES_DIR, src);
    if (fs.existsSync(srcPath)) {
      fs.unlinkSync(srcPath);
      console.log(`✗ Deleted: ${src}`);
    }
  }

  // Also remove the duplicate
  const dup = path.join(IMAGES_DIR, "AdobeStock_543175892 (3).jpeg");
  if (fs.existsSync(dup)) {
    fs.unlinkSync(dup);
    console.log("✗ Deleted: AdobeStock_543175892 (3).jpeg (duplicate)");
  }

  console.log("\n=== 完了 ===");
}

main().catch(console.error);
