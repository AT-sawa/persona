/**
 * Case category definitions for SEO archive pages.
 * Each category uses keyword-based matching against case title,
 * description, must_req, and industry fields.
 */

export interface CaseCategory {
  slug: string;
  name: string;
  /** English label for display */
  label: string;
  /** Page h1 sub-heading */
  heading: string;
  /** Meta description for SEO */
  metaDescription: string;
  /** In-page introduction paragraph */
  intro: string;
  /** Keywords used to match cases (matched against title + description + must_req + industry) */
  keywords: string[];
  /** Related expertise areas for internal linking */
  relatedExpertise?: string[];
  /** Related industry areas for internal linking */
  relatedIndustries?: string[];
}

export const CASE_CATEGORIES: CaseCategory[] = [
  {
    slug: "strategy",
    name: "戦略コンサルティング",
    label: "STRATEGY",
    heading: "戦略コンサルティング案件一覧",
    metaDescription:
      "戦略コンサルティングのフリーランス案件一覧。経営戦略・事業戦略・中期経営計画・新市場参入戦略など、McKinsey・BCG・Bain等の戦略ファーム出身コンサルタント向けの高単価案件を掲載。",
    intro:
      "経営戦略の立案から事業ポートフォリオの再構築、中期経営計画の策定まで、戦略コンサルティング領域のフリーランス案件を掲載しています。大手戦略ファーム出身者の知見が活かせるプロジェクトを多数取り揃えています。",
    keywords: ["戦略", "経営戦略", "事業戦略", "中期経営計画", "経営企画", "ポートフォリオ", "戦略策定", "戦略立案"],
    relatedExpertise: ["strategy"],
  },
  {
    slug: "dx",
    name: "DX・デジタル変革",
    label: "DX",
    heading: "DX・デジタル変革案件一覧",
    metaDescription:
      "DX（デジタルトランスフォーメーション）のフリーランスコンサル案件一覧。デジタル戦略策定・AI活用・データ分析基盤構築・クラウド移行など、デジタル変革を推進するプロジェクトを掲載。",
    intro:
      "デジタル戦略の策定からAI・データ活用、レガシーシステムのモダナイゼーションまで、DX推進に関わるフリーコンサル案件を掲載しています。Accenture・Deloitte Digital等のデジタルファーム出身者に最適なプロジェクトです。",
    keywords: ["DX", "デジタル", "AI", "データ", "クラウド", "デジタル化", "デジタルトランスフォーメーション", "IoT", "RPA"],
    relatedExpertise: ["dx"],
  },
  {
    slug: "pmo",
    name: "PMO・プロジェクト管理",
    label: "PMO",
    heading: "PMO・プロジェクト管理案件一覧",
    metaDescription:
      "PMO（プロジェクトマネジメントオフィス）のフリーランス案件一覧。大規模プロジェクトの推進管理・進捗管理・リスク管理など、PM経験者向けの高単価案件を多数掲載。",
    intro:
      "大規模IT導入プロジェクトから全社変革プログラムまで、PMO・プロジェクトマネジメント領域のフリーコンサル案件を掲載しています。PM・PMO経験を活かした案件参画が可能です。",
    keywords: ["PMO", "プロジェクト管理", "PM", "プロジェクトマネジメント", "プロジェクト推進", "進捗管理", "PgMO"],
    relatedExpertise: ["pmo"],
  },
  {
    slug: "sap",
    name: "SAP・ERP導入",
    label: "SAP / ERP",
    heading: "SAP・ERP導入案件一覧",
    metaDescription:
      "SAP・ERP導入のフリーランスコンサル案件一覧。SAP S/4HANA移行・基幹システム刷新・会計システム導入など、ERPコンサルタント向けの高単価案件を掲載。",
    intro:
      "SAP S/4HANAへの移行プロジェクトから基幹システムの刷新、会計・人事・購買モジュールの導入まで、SAP・ERP領域のフリーコンサル案件を掲載しています。FI/CO/MM/SD/PP等の各モジュール経験者向けです。",
    keywords: ["SAP", "ERP", "S/4HANA", "基幹システム", "FI", "CO", "MM", "SD", "ABAP", "Basis"],
    relatedExpertise: ["sap"],
  },
  {
    slug: "bpr",
    name: "業務改革・BPR",
    label: "BPR",
    heading: "業務改革・BPR案件一覧",
    metaDescription:
      "業務改革（BPR）のフリーランスコンサル案件一覧。業務プロセス改善・コスト削減・オペレーション最適化など、業務変革プロジェクトを掲載。",
    intro:
      "業務プロセスの抜本的な見直しからオペレーション効率化、コスト構造改革まで、BPR・業務改革領域のフリーコンサル案件を掲載しています。現場改革の経験を活かせるプロジェクトが見つかります。",
    keywords: ["BPR", "業務改革", "業務改善", "業務プロセス", "プロセス改革", "オペレーション", "業務効率化", "コスト削減"],
    relatedExpertise: ["bpr"],
  },
  {
    slug: "new-business",
    name: "新規事業開発",
    label: "NEW BUSINESS",
    heading: "新規事業開発案件一覧",
    metaDescription:
      "新規事業開発のフリーランスコンサル案件一覧。事業計画策定・市場調査・PoC推進・ビジネスモデル設計など、新規事業の立ち上げを支援するプロジェクトを掲載。",
    intro:
      "新規事業の構想段階から事業計画の策定、PoC（概念実証）の推進、事業化まで、新規事業開発に関わるフリーコンサル案件を掲載しています。事業開発やイノベーション推進の経験者に最適です。",
    keywords: ["新規事業", "事業開発", "事業立ち上げ", "PoC", "ビジネスモデル", "事業計画", "イノベーション", "R&D"],
    relatedExpertise: ["new-business"],
  },
  {
    slug: "ma",
    name: "M&A・PMI",
    label: "M&A",
    heading: "M&A・PMI案件一覧",
    metaDescription:
      "M&A・PMI（Post Merger Integration）のフリーランスコンサル案件一覧。デューデリジェンス・バリュエーション・統合計画策定・シナジー実現など、M&A関連プロジェクトを掲載。",
    intro:
      "M&A戦略の立案からデューデリジェンス、PMI（統合プロセス）の推進まで、M&A領域のフリーコンサル案件を掲載しています。投資銀行・FAS・戦略ファーム出身者に最適なプロジェクトです。",
    keywords: ["M&A", "PMI", "デューデリジェンス", "DD", "バリュエーション", "統合", "買収", "合併", "FAS"],
  },
  {
    slug: "it-system",
    name: "IT戦略・システム開発",
    label: "IT SYSTEM",
    heading: "IT戦略・システム開発案件一覧",
    metaDescription:
      "IT戦略・システム開発のフリーランスコンサル案件一覧。IT中長期計画策定・システム企画・要件定義・アーキテクチャ設計など、ITコンサルタント向けプロジェクトを掲載。",
    intro:
      "IT戦略の策定からシステム企画・要件定義、アーキテクチャ設計まで、IT・システム開発領域のフリーコンサル案件を掲載しています。アクセンチュア・IBM・NRI等のITコンサル出身者向けです。",
    keywords: ["IT", "システム", "要件定義", "アーキテクチャ", "インフラ", "ネットワーク", "セキュリティ", "IT戦略", "IT企画"],
  },
  {
    slug: "scm",
    name: "SCM・サプライチェーン",
    label: "SCM",
    heading: "SCM・サプライチェーン案件一覧",
    metaDescription:
      "SCM（サプライチェーンマネジメント）のフリーランスコンサル案件一覧。調達最適化・物流改革・在庫管理・S&OP導入など、サプライチェーン改革プロジェクトを掲載。",
    intro:
      "調達戦略の見直しから物流ネットワークの最適化、S&OP（販売・操業計画）の導入まで、SCM・サプライチェーン領域のフリーコンサル案件を掲載しています。",
    keywords: ["SCM", "サプライチェーン", "調達", "物流", "ロジスティクス", "在庫", "購買", "S&OP"],
  },
  {
    slug: "hr-org",
    name: "人事・組織改革",
    label: "HR / ORG",
    heading: "人事・組織改革案件一覧",
    metaDescription:
      "人事・組織改革のフリーランスコンサル案件一覧。人事制度設計・タレントマネジメント・組織設計・チェンジマネジメントなど、HR領域のプロジェクトを掲載。",
    intro:
      "人事制度の設計から組織再編、タレントマネジメント導入、チェンジマネジメントまで、人事・組織改革領域のフリーコンサル案件を掲載しています。",
    keywords: ["人事", "HR", "組織", "人材", "タレント", "チェンジマネジメント", "人事制度", "組織改革", "組織再編"],
  },
  {
    slug: "finance-accounting",
    name: "経理・財務・管理会計",
    label: "FINANCE",
    heading: "経理・財務・管理会計案件一覧",
    metaDescription:
      "経理・財務・管理会計のフリーランスコンサル案件一覧。経理業務改革・管理会計導入・IFRS対応・決算早期化など、財務会計領域のプロジェクトを掲載。",
    intro:
      "管理会計の高度化から経理業務の効率化、IFRS対応、決算プロセス改革まで、財務・会計領域のフリーコンサル案件を掲載しています。Big4 FAS・監査法人出身者に最適です。",
    keywords: ["経理", "財務", "会計", "管理会計", "IFRS", "決算", "予算", "経営管理", "原価"],
  },
  {
    slug: "marketing-cx",
    name: "マーケティング・CX",
    label: "MARKETING",
    heading: "マーケティング・CX案件一覧",
    metaDescription:
      "マーケティング・CX（顧客体験）のフリーランスコンサル案件一覧。マーケティング戦略策定・CRM導入・顧客データ活用・EC戦略など、マーケティング領域のプロジェクトを掲載。",
    intro:
      "マーケティング戦略の策定からCRM導入、顧客データ基盤の構築、EC戦略まで、マーケティング・CX領域のフリーコンサル案件を掲載しています。",
    keywords: ["マーケティング", "CRM", "CX", "顧客体験", "EC", "デジタルマーケティング", "ブランド", "広告"],
  },
];

/** All category slugs for static params generation */
export const CASE_CATEGORY_SLUGS = CASE_CATEGORIES.map((c) => c.slug);

/** Get a category by slug */
export function getCategoryBySlug(slug: string): CaseCategory | undefined {
  return CASE_CATEGORIES.find((c) => c.slug === slug);
}
