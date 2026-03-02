/**
 * 50記事のブログ記事をcontent/blog/に変換・配置するスクリプト
 * サムネイルもpublic/images/blog/にコピー
 */
import fs from "fs";
import path from "path";

const ARTICLES_DIR = "/Users/sawamasumi/claude-work/PERSONA/persona_blog_50";
const CONTENT_DIR = "/Users/sawamasumi/claude-work/PERSONA/persona/content/blog";
const IMAGES_DIR = "/Users/sawamasumi/claude-work/PERSONA/persona/public/images/blog";

// Article metadata: [slug, category]
const ARTICLE_META = [
  ["persona-platform-overview", "サービス紹介"],
  ["choose-freelance-consulting-service", "ノウハウ"],
  ["first-challenges-after-independence", "キャリア"],
  ["three-categories-of-consulting", "業界トレンド"],
  ["ai-projects-for-freelance-consultants", "業界トレンド"],
  ["why-matching-fails", "ノウハウ"],
  ["workload-design-strategy", "キャリア"],
  ["how-many-agents-to-register", "ノウハウ"],
  ["why-strategy-projects-pay-more", "業界トレンド"],
  ["why-top-firm-alumni-choose-persona", "サービス紹介"],
  ["how-to-use-freelance-consultants", "企業向け"],
  ["best-timing-to-leave-firm", "キャリア"],
  ["freelance-vs-firm-comparison", "企業向け"],
  ["fee-negotiation-tips", "キャリア"],
  ["why-companies-fail-with-freelancers", "企業向け"],
  ["business-consultant-to-it-projects", "キャリア"],
  ["minimum-unit-freelance-consulting", "企業向け"],
  ["skill-sheet-writing-guide", "ノウハウ"],
  ["dx-with-freelance-consultants", "業界トレンド"],
  ["how-to-get-repeat-projects", "ノウハウ"],
  ["tax-filing-and-incorporation", "キャリア"],
  ["outsourcing-pmo-to-freelancers", "企業向け"],
  ["mbb-alumni-freelance-guide", "キャリア"],
  ["generative-ai-with-freelance-consultants", "業界トレンド"],
  ["big4-alumni-freelance-guide", "キャリア"],
  ["freelance-consulting-cost-guide", "企業向け"],
  ["parallel-project-management", "ノウハウ"],
  ["mid-term-plan-with-freelancers", "企業向け"],
  ["remote-freelance-consulting", "ノウハウ"],
  ["freelance-consulting-case-studies", "企業向け"],
  ["accenture-alumni-freelance-guide", "キャリア"],
  ["freelance-contract-types", "企業向け"],
  ["freelance-annual-income-simulation", "キャリア"],
  ["new-business-with-freelancers", "企業向け"],
  ["freelance-suitability-checklist", "キャリア"],
  ["why-companies-repeat-freelancers", "企業向け"],
  ["skills-to-develop-after-independence", "キャリア"],
  ["sap-with-freelance-consultants", "業界トレンド"],
  ["freelance-sales-not-needed", "ノウハウ"],
  ["freelance-onboarding-guide", "企業向け"],
  ["freelance-mental-health", "キャリア"],
  ["pmi-with-freelance-consultants", "企業向け"],
  ["ten-year-freelance-career-design", "キャリア"],
  ["freelancers-for-corporate-planning", "企業向け"],
  ["freelance-client-interview-tips", "ノウハウ"],
  ["internal-approval-for-freelancers", "企業向け"],
  ["freelance-market-outlook", "業界トレンド"],
  ["cost-reduction-with-freelancers", "企業向け"],
  ["breaking-out-of-busy-but-stagnant", "キャリア"],
  ["freelance-utilization-checklist", "企業向け"],
];

// Generate dates from 2025-12-02 to 2026-02-27 (spread evenly)
function generateDates(count) {
  const start = new Date("2025-12-02");
  const end = new Date("2026-02-27");
  const range = end.getTime() - start.getTime();
  const step = range / (count - 1);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start.getTime() + step * i);
    return d.toISOString().split("T")[0];
  });
}

const dates = generateDates(50);

// Extract first paragraph as description (skip title line and ---)
function extractDescription(content) {
  const lines = content.split("\n");
  let desc = "";
  let started = false;
  for (const line of lines) {
    if (line.startsWith("# ")) continue; // skip title
    if (line.trim() === "---") {
      if (started) break; // second --- means end of section
      continue;
    }
    if (line.trim() === "") {
      if (started) break;
      continue;
    }
    if (!line.startsWith("#") && !line.startsWith("|") && !line.startsWith("☐")) {
      desc = line.trim();
      started = true;
      break;
    }
  }
  // Truncate to ~120 chars
  if (desc.length > 120) {
    desc = desc.substring(0, 117) + "...";
  }
  return desc;
}

// Main
function main() {
  fs.mkdirSync(CONTENT_DIR, { recursive: true });
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  for (let i = 0; i < 50; i++) {
    const num = String(i + 1).padStart(2, "0");
    const [slug, category] = ARTICLE_META[i];
    const date = dates[i];

    // Read article
    const raw = fs.readFileSync(path.join(ARTICLES_DIR, `article_${num}.md`), "utf8");

    // Extract title from first line
    const titleMatch = raw.match(/^#\s+(.+)/);
    const title = titleMatch ? titleMatch[1].trim() : `記事${num}`;

    // Extract description
    const description = extractDescription(raw);

    // Remove first heading line from content (it'll be in frontmatter)
    const contentWithoutTitle = raw.replace(/^#\s+.+\n*/, "");

    // Build frontmatter
    const frontmatter = [
      "---",
      `title: "${title.replace(/"/g, '\\"')}"`,
      `date: "${date}"`,
      `description: "${description.replace(/"/g, '\\"')}"`,
      `category: "${category}"`,
      `thumbnail: "/images/blog/thumb_${num}.png"`,
      "---",
      "",
    ].join("\n");

    const output = frontmatter + contentWithoutTitle;

    // Write to content/blog/
    const filename = `${date}-${slug}.md`;
    fs.writeFileSync(path.join(CONTENT_DIR, filename), output);

    // Copy thumbnail
    const thumbSrc = path.join(ARTICLES_DIR, `thumb_${num}.png`);
    const thumbDst = path.join(IMAGES_DIR, `thumb_${num}.png`);
    if (fs.existsSync(thumbSrc)) {
      fs.copyFileSync(thumbSrc, thumbDst);
    }

    console.log(`✓ ${filename} (${category})`);
  }

  console.log(`\nDone! ${50} articles imported.`);
}

main();
