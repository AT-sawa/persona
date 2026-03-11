// ============================================
// AI業務診断 — データ定義 & 計算ロジック
// ============================================

// ===== Step 1: 部署 =====
export const DEPARTMENTS = [
  { id: "sales", label: "営業部門", icon: "handshake", description: "営業・商談・提案書作成" },
  { id: "finance", label: "経理・財務", icon: "account_balance", description: "請求書・経費・決算処理" },
  { id: "hr", label: "人事・総務", icon: "group", description: "採用・労務・社内管理" },
  { id: "marketing", label: "マーケティング", icon: "campaign", description: "施策立案・分析・コンテンツ" },
  { id: "it", label: "IT・情報システム", icon: "terminal", description: "システム運用・ヘルプデスク" },
  { id: "operations", label: "業務・オペレーション", icon: "settings", description: "受発注・在庫・物流管理" },
  { id: "legal", label: "法務・コンプライアンス", icon: "gavel", description: "契約書・規制対応" },
  { id: "management", label: "経営企画", icon: "insights", description: "事業戦略・中計・M&A" },
] as const;

// ===== Step 2: 業務（部署に応じて動的に変わる） =====
export interface FunctionOption {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const DEPARTMENT_FUNCTIONS: Record<string, FunctionOption[]> = {
  sales: [
    { id: "inside_sales", label: "インサイドセールス", icon: "phone_in_talk", description: "リード獲得・アポ取り・架電" },
    { id: "field_sales", label: "フィールドセールス", icon: "storefront", description: "商談・提案・見積作成" },
    { id: "sales_planning", label: "営業企画・分析", icon: "analytics", description: "売上分析・予実管理・戦略立案" },
    { id: "customer_success", label: "カスタマーサクセス", icon: "support_agent", description: "既存顧客フォロー・解約防止" },
  ],
  finance: [
    { id: "accounting", label: "経理", icon: "receipt_long", description: "仕訳・請求書処理・支払管理" },
    { id: "treasury", label: "財務", icon: "savings", description: "資金管理・資金調達・キャッシュフロー" },
    { id: "management_accounting", label: "管理会計", icon: "monitoring", description: "予算管理・原価計算・部門別PL" },
    { id: "tax", label: "税務", icon: "description", description: "確定申告・税務調査・移転価格" },
  ],
  hr: [
    { id: "recruitment", label: "採用", icon: "person_search", description: "新卒・中途採用・面接管理" },
    { id: "labor_management", label: "労務", icon: "badge", description: "勤怠管理・給与計算・社会保険" },
    { id: "training", label: "研修・人材育成", icon: "school", description: "研修企画・eラーニング・OJT" },
    { id: "hr_evaluation", label: "人事制度・評価", icon: "star_rate", description: "評価制度・等級設計・異動管理" },
    { id: "general_affairs", label: "総務", icon: "apartment", description: "施設管理・備品・庶務全般" },
  ],
  marketing: [
    { id: "digital_marketing", label: "デジタルマーケティング", icon: "ads_click", description: "広告運用・SEO・Web分析" },
    { id: "content_sns", label: "コンテンツ・SNS運用", icon: "edit_note", description: "記事作成・SNS投稿・動画制作" },
    { id: "pr_communications", label: "PR・広報", icon: "newspaper", description: "プレスリリース・メディア対応" },
    { id: "crm_cx", label: "CRM・顧客体験", icon: "loyalty", description: "顧客分析・リテンション・LTV向上" },
  ],
  it: [
    { id: "it_infrastructure", label: "インフラ・運用", icon: "dns", description: "サーバー管理・ネットワーク・監視" },
    { id: "helpdesk", label: "社内ヘルプデスク", icon: "headset_mic", description: "問い合わせ対応・PC管理・FAQ" },
    { id: "it_security", label: "セキュリティ", icon: "shield", description: "セキュリティ監査・アクセス管理" },
    { id: "system_dev", label: "システム企画・開発", icon: "code", description: "要件定義・開発管理・ベンダー管理" },
  ],
  operations: [
    { id: "order_management", label: "受発注管理", icon: "shopping_cart", description: "受注処理・発注書作成・取引管理" },
    { id: "inventory_logistics", label: "在庫・物流管理", icon: "inventory_2", description: "在庫管理・倉庫管理・配送手配" },
    { id: "quality_management", label: "品質管理", icon: "verified", description: "検品・品質検査・不良管理" },
    { id: "customer_support", label: "カスタマーサポート", icon: "contact_support", description: "問い合わせ対応・クレーム処理" },
  ],
  legal: [
    { id: "contract_management", label: "契約管理", icon: "handshake", description: "契約書作成・レビュー・管理" },
    { id: "compliance", label: "コンプライアンス", icon: "policy", description: "法令対応・内部統制・監査" },
    { id: "ip_management", label: "知財管理", icon: "workspace_premium", description: "特許・商標出願・ライセンス管理" },
  ],
  management: [
    { id: "corporate_strategy", label: "経営戦略・中計", icon: "strategy", description: "中期経営計画・事業ポートフォリオ" },
    { id: "corporate_management", label: "経営管理・IR", icon: "assessment", description: "KPI管理・取締役会資料・IR" },
    { id: "ma_bd", label: "M&A・事業開発", icon: "merge_type", description: "DD・バリュエーション・PMI" },
    { id: "new_business", label: "新規事業", icon: "rocket_launch", description: "事業企画・PoC・市場調査" },
  ],
};

// ===== Step 3: 規模 =====
export const COMPANY_SIZES = [
  { id: "small", label: "〜50名", description: "スタートアップ・中小企業" },
  { id: "medium", label: "51〜300名", description: "中堅企業" },
  { id: "large", label: "301〜1,000名", description: "大企業" },
  { id: "enterprise", label: "1,001名以上", description: "大手エンタープライズ" },
] as const;

// ===== Step 4: 利用中システム =====
export const SYSTEMS = [
  { id: "excel", label: "Excel / スプレッドシート" },
  { id: "erp", label: "ERP（SAP, Oracle等）" },
  { id: "crm", label: "CRM（Salesforce, HubSpot等）" },
  { id: "chat", label: "ビジネスチャット（Slack, Teams等）" },
  { id: "accounting", label: "会計ソフト（freee, MF等）" },
  { id: "legacy", label: "レガシーシステム / 独自システム" },
  { id: "paper", label: "紙・手作業が中心" },
  { id: "none", label: "特になし / わからない" },
] as const;

// ===== Step 5: 課題 =====
export const CHALLENGES = [
  { id: "manual", label: "手作業・繰り返し作業が多い" },
  { id: "data_silo", label: "データがバラバラで活用できない" },
  { id: "slow_decision", label: "意思決定に時間がかかる" },
  { id: "talent_shortage", label: "DX推進できる人材がいない" },
  { id: "cost_pressure", label: "コスト削減のプレッシャー" },
  { id: "quality", label: "ヒューマンエラーが多い" },
  { id: "reporting", label: "レポート・報告作業が重い" },
  { id: "customer", label: "顧客対応の品質にムラがある" },
] as const;

// ===== 型定義 =====
export interface DiagnosisInput {
  department: string;
  businessFunction: string;
  companySize: string;
  systems: string[];
  challenges: string[];
}

export interface WorkflowItem {
  taskName: string;
  beforeProcess: string;
  afterProcess: string;
  beforeHours: number;
  afterHours: number;
  reductionPercent: number;
  tools: string[];
  relatedChallenges: string[];
}

export interface Recommendation {
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  timeframe: string;
}

export interface DiagnosisResult {
  estimatedHoursSaved: number;
  estimatedCostSaved: number; // 万円/年
  automationPotential: number; // 0-100
  workflows: WorkflowItem[];
  recommendations: Recommendation[];
  departmentLabel: string;
  functionLabel: string;
  companySizeLabel: string;
}

// ===== 業務別ワークフロー（部署ではなく「業務」でキー） =====
const FUNCTION_WORKFLOWS: Record<string, WorkflowItem[]> = {
  // ── 営業 ──────────────────────────
  inside_sales: [
    {
      taskName: "リードリスト作成・スコアリング",
      beforeProcess: "展示会名刺やWeb問い合わせをExcelに手入力→属性ごとに手動で優先度付け",
      afterProcess: "AIが自動でリード情報を統合→行動履歴・属性からスコアリング→優先リスト生成",
      beforeHours: 20, afterHours: 4, reductionPercent: 80,
      tools: ["Salesforce Einstein", "HubSpot AI", "FORCAS"],
      relatedChallenges: ["manual", "data_silo"],
    },
    {
      taskName: "架電スクリプト・メール文面作成",
      beforeProcess: "テンプレートを都度修正→業界・課題に合わせて手動カスタマイズ",
      afterProcess: "AIがリード属性に応じたパーソナライズ文面を自動生成→A/Bテスト提案",
      beforeHours: 15, afterHours: 3, reductionPercent: 80,
      tools: ["ChatGPT / Claude", "Outreach", "Salesloft"],
      relatedChallenges: ["manual", "customer"],
    },
    {
      taskName: "商談アポ調整",
      beforeProcess: "メールの往復で日程調整→カレンダー手動確認→社内確認→返信",
      afterProcess: "AI日程調整ツールが空き時間を自動提示→リマインド自動送信",
      beforeHours: 10, afterHours: 2, reductionPercent: 80,
      tools: ["Calendly", "TimeRex", "Spir"],
      relatedChallenges: ["manual", "quality"],
    },
  ],
  field_sales: [
    {
      taskName: "提案書・見積書作成",
      beforeProcess: "過去資料をフォルダから探し、手動でカスタマイズ・金額計算",
      afterProcess: "AIが顧客情報から最適テンプレートを選定→ドラフト自動生成→レビューのみ",
      beforeHours: 30, afterHours: 8, reductionPercent: 73,
      tools: ["ChatGPT / Copilot", "Gamma", "Beautiful.ai"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "商談議事録・フォローアップ",
      beforeProcess: "商談中にメモ→帰社後にCRMに手入力→フォローメール作成",
      afterProcess: "AI音声文字起こし→要点自動抽出→CRM自動更新→フォローメール下書き生成",
      beforeHours: 20, afterHours: 4, reductionPercent: 80,
      tools: ["Otter.ai / CLOVA Note", "Salesforce Einstein"],
      relatedChallenges: ["manual", "data_silo", "reporting"],
    },
    {
      taskName: "競合分析・事前リサーチ",
      beforeProcess: "Web検索で手動収集→Excelにまとめ→商談前にざっと目を通す",
      afterProcess: "AIが企業情報・ニュース・IR資料を自動収集→商談向けサマリー生成",
      beforeHours: 12, afterHours: 3, reductionPercent: 75,
      tools: ["Perplexity", "SPEEDA", "Claude"],
      relatedChallenges: ["manual", "slow_decision"],
    },
  ],
  sales_planning: [
    {
      taskName: "売上予測・パイプライン分析",
      beforeProcess: "CRM/Excelから手動でデータ抽出→ピボットテーブルで集計→予測は経験則",
      afterProcess: "AIが受注確度を自動予測→パイプライン可視化→未達リスクアラート",
      beforeHours: 20, afterHours: 4, reductionPercent: 80,
      tools: ["Salesforce AI", "Clari", "Tableau"],
      relatedChallenges: ["data_silo", "slow_decision", "reporting"],
    },
    {
      taskName: "営業KPIレポート作成",
      beforeProcess: "複数システムからデータ手動集計→Excelグラフ作成→PowerPointにまとめ",
      afterProcess: "BIツール自動集計→AIがコメント生成→ダッシュボード自動更新",
      beforeHours: 15, afterHours: 3, reductionPercent: 80,
      tools: ["Power BI / Tableau", "Copilot", "Domo"],
      relatedChallenges: ["reporting", "manual", "data_silo"],
    },
    {
      taskName: "テリトリー・リソース配分",
      beforeProcess: "Excelで担当割り振り→手動で案件バランス確認→調整会議",
      afterProcess: "AIが案件量・受注確度・顧客規模から最適配分を提案",
      beforeHours: 10, afterHours: 3, reductionPercent: 70,
      tools: ["Anaplan", "Salesforce Maps"],
      relatedChallenges: ["slow_decision", "data_silo"],
    },
  ],
  customer_success: [
    {
      taskName: "解約リスク検知・アラート",
      beforeProcess: "利用状況を手動チェック→NPS結果を確認→直感でフォロー優先度を決定",
      afterProcess: "AIがログイン頻度・機能利用率・問い合わせ傾向から解約リスクを自動スコアリング",
      beforeHours: 15, afterHours: 3, reductionPercent: 80,
      tools: ["Gainsight", "HiCustomer", "Amplitude"],
      relatedChallenges: ["data_silo", "customer"],
    },
    {
      taskName: "顧客オンボーディング",
      beforeProcess: "マニュアルを手動送付→進捗を個別ヒアリング→つまずきポイントを後から把握",
      afterProcess: "AIが進捗自動トラッキング→つまずき検知→次のアクションを自動レコメンド",
      beforeHours: 20, afterHours: 6, reductionPercent: 70,
      tools: ["WalkMe", "Pendo", "Notion AI"],
      relatedChallenges: ["manual", "customer", "quality"],
    },
    {
      taskName: "活用レポート・QBR資料作成",
      beforeProcess: "利用データ手動集計→ROI計算→PowerPointで報告資料作成",
      afterProcess: "AIがKPI自動集計→成果サマリー生成→レポート自動作成",
      beforeHours: 12, afterHours: 3, reductionPercent: 75,
      tools: ["Copilot", "Gainsight", "Tableau"],
      relatedChallenges: ["reporting", "manual"],
    },
  ],

  // ── 経理・財務 ──────────────────────────
  accounting: [
    {
      taskName: "請求書処理・仕訳",
      beforeProcess: "紙/PDFの請求書を目視確認→会計ソフトに手入力→仕訳チェック",
      afterProcess: "AI-OCRで自動読取→仕訳候補生成→会計ソフト自動連携→例外のみ確認",
      beforeHours: 40, afterHours: 8, reductionPercent: 80,
      tools: ["sweeep", "invox", "freee"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "経費精算",
      beforeProcess: "紙の領収書を受領→Excelに転記→承認回覧→会計ソフトに再入力",
      afterProcess: "スマホ撮影→AI自動分類・金額読取→ワークフロー承認→自動仕訳",
      beforeHours: 20, afterHours: 4, reductionPercent: 80,
      tools: ["マネーフォワード", "TOKIUM", "楽楽精算"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "入金消込・債権管理",
      beforeProcess: "銀行明細と請求書を手動突合→未入金リスト作成→督促メール作成",
      afterProcess: "AI自動マッチング→未入金アラート→督促メール自動生成",
      beforeHours: 15, afterHours: 3, reductionPercent: 80,
      tools: ["V-ONEクラウド", "請求管理ロボ"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "月次決算処理",
      beforeProcess: "各部門からデータ収集→手動で調整仕訳→残高確認→報告書作成",
      afterProcess: "データ自動集計→AI異常値検出→調整仕訳提案→決算レポート自動生成",
      beforeHours: 25, afterHours: 8, reductionPercent: 68,
      tools: ["freee", "マネーフォワード", "Copilot"],
      relatedChallenges: ["reporting", "slow_decision", "manual"],
    },
  ],
  treasury: [
    {
      taskName: "資金繰り管理・キャッシュフロー予測",
      beforeProcess: "Excelで入出金予定を手動管理→銀行残高を毎日確認→資金ショートを目視判断",
      afterProcess: "AI連携で入出金自動予測→資金ショートリスクを早期アラート→最適調達提案",
      beforeHours: 20, afterHours: 5, reductionPercent: 75,
      tools: ["Kyriba", "CashAnalytics", "Copilot"],
      relatedChallenges: ["manual", "slow_decision"],
    },
    {
      taskName: "銀行取引・振込処理",
      beforeProcess: "支払い依頼を紙で回覧→振込データ手入力→ダブルチェック→銀行サイトで実行",
      afterProcess: "ワークフロー申請→承認後に振込データ自動生成→API連携で自動実行",
      beforeHours: 15, afterHours: 3, reductionPercent: 80,
      tools: ["全銀API", "マネーフォワード Pay", "バクラク"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "借入・資金調達管理",
      beforeProcess: "借入条件をExcel管理→返済スケジュール手動追跡→金利変動を個別確認",
      afterProcess: "借入一覧自動管理→返済アラート→金利シミュレーション自動更新",
      beforeHours: 8, afterHours: 2, reductionPercent: 75,
      tools: ["Treasury管理SaaS", "Excel Copilot"],
      relatedChallenges: ["data_silo", "manual"],
    },
  ],
  management_accounting: [
    {
      taskName: "予算管理・予実対比",
      beforeProcess: "各部門からExcel予算を回収→手動統合→差異分析→コメント付与→役員報告",
      afterProcess: "予算データ自動集約→AIが差異原因分析→コメント自動生成→ダッシュボード",
      beforeHours: 25, afterHours: 6, reductionPercent: 76,
      tools: ["Anaplan", "Power BI", "Copilot"],
      relatedChallenges: ["reporting", "data_silo", "slow_decision"],
    },
    {
      taskName: "部門別PL・原価計算",
      beforeProcess: "複数システムから配賦データ手動集計→配賦ルール適用→検証に時間",
      afterProcess: "データ自動連携→配賦ルールAI適用→部門別PL自動生成→異常値アラート",
      beforeHours: 20, afterHours: 5, reductionPercent: 75,
      tools: ["SAP / Oracle", "Power BI", "Tableau"],
      relatedChallenges: ["manual", "data_silo"],
    },
    {
      taskName: "経営ダッシュボード更新",
      beforeProcess: "各種KPIを手動で収集→Excel加工→グラフ作成→PowerPointにまとめ",
      afterProcess: "BIツールがリアルタイム自動更新→AIがインサイト付与→アラート自動配信",
      beforeHours: 15, afterHours: 3, reductionPercent: 80,
      tools: ["Tableau", "Power BI", "Domo"],
      relatedChallenges: ["reporting", "slow_decision"],
    },
  ],
  tax: [
    {
      taskName: "税務申告書作成",
      beforeProcess: "会計データから手動で税務調整→別表作成→計算チェック→提出",
      afterProcess: "AIが会計データから税務調整候補を自動生成→別表ドラフト作成→レビュー集中",
      beforeHours: 30, afterHours: 10, reductionPercent: 67,
      tools: ["達人シリーズ", "TKC", "Copilot"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "税制改正対応・影響分析",
      beforeProcess: "官報・通達を手動チェック→自社影響範囲を洗い出し→対応方針を手作業で整理",
      afterProcess: "AIが税制改正を自動モニタリング→自社影響度を即座に分析→対応チェックリスト生成",
      beforeHours: 12, afterHours: 3, reductionPercent: 75,
      tools: ["リーガルテックAI", "ChatGPT / Claude"],
      relatedChallenges: ["manual", "slow_decision"],
    },
    {
      taskName: "消費税・インボイス管理",
      beforeProcess: "適格請求書の要件を手動確認→仕入税額控除の計算→経過措置の適用判断",
      afterProcess: "AI-OCRがインボイス自動判定→税額計算自動化→不備アラート",
      beforeHours: 15, afterHours: 4, reductionPercent: 73,
      tools: ["invox", "バクラク", "freee"],
      relatedChallenges: ["manual", "quality"],
    },
  ],

  // ── 人事・総務 ──────────────────────────
  recruitment: [
    {
      taskName: "書類スクリーニング",
      beforeProcess: "履歴書・職務経歴書を1件ずつ目視確認→Excelに評価記入→面接候補選定",
      afterProcess: "AIが書類を自動スコアリング→要件適合度ランキング→面接候補を推薦",
      beforeHours: 25, afterHours: 5, reductionPercent: 80,
      tools: ["HERP", "HRMOS", "AI採用ツール"],
      relatedChallenges: ["manual", "talent_shortage"],
    },
    {
      taskName: "求人票作成・媒体管理",
      beforeProcess: "求人要件をヒアリング→各媒体フォーマットに手動入力→更新のたびに各サイト修正",
      afterProcess: "AIが要件から魅力的な求人文面を自動生成→複数媒体に一括配信・更新",
      beforeHours: 15, afterHours: 3, reductionPercent: 80,
      tools: ["ChatGPT / Claude", "HRMOS", "Wantedly"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "面接日程調整・候補者連絡",
      beforeProcess: "候補者・面接官の空き確認→メール往復で調整→リマインド手動送信",
      afterProcess: "AI日程調整ツールが自動マッチング→候補者に自動通知→リマインド自動送信",
      beforeHours: 12, afterHours: 2, reductionPercent: 83,
      tools: ["Calendly", "HRMOS", "TimeRex"],
      relatedChallenges: ["manual", "customer"],
    },
    {
      taskName: "採用データ分析・レポート",
      beforeProcess: "応募数・通過率・採用単価をExcelで手動集計→月次レポート作成",
      afterProcess: "ATSデータ自動集計→AIが採用チャネル効果分析→改善提案レポート",
      beforeHours: 8, afterHours: 2, reductionPercent: 75,
      tools: ["HRMOS", "Tableau", "Copilot"],
      relatedChallenges: ["reporting", "data_silo"],
    },
  ],
  labor_management: [
    {
      taskName: "勤怠管理・集計",
      beforeProcess: "タイムカード/Excel集計→残業時間計算→36協定チェック→異常値を目視確認",
      afterProcess: "勤怠データ自動集計→AI残業アラート→36協定超過予測→異常検知通知",
      beforeHours: 20, afterHours: 4, reductionPercent: 80,
      tools: ["SmartHR", "ジョブカン", "KING OF TIME"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "給与計算・明細配信",
      beforeProcess: "勤怠データから手動計算→控除項目確認→給与ソフト入力→明細印刷・配付",
      afterProcess: "勤怠連携→自動計算→AI検算→Web明細自動配信",
      beforeHours: 25, afterHours: 5, reductionPercent: 80,
      tools: ["SmartHR", "freee人事労務", "マネーフォワード"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "社会保険・入退社手続き",
      beforeProcess: "入退社のたびに書類作成→社会保険事務所に届出→マイナンバー管理",
      afterProcess: "入社情報入力→AI自動で届出書類生成→電子申請→マイナンバー暗号化管理",
      beforeHours: 12, afterHours: 3, reductionPercent: 75,
      tools: ["SmartHR", "オフィスステーション", "e-Gov連携"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "就業規則・労務相談対応",
      beforeProcess: "従業員からの質問にメールで個別回答→規程確認→労基法チェック",
      afterProcess: "AIチャットボットが就業規則FAQ即答→複雑な相談のみ人が対応",
      beforeHours: 10, afterHours: 3, reductionPercent: 70,
      tools: ["ChatGPT Enterprise", "SmartHR", "PKSHA"],
      relatedChallenges: ["manual", "customer"],
    },
  ],
  training: [
    {
      taskName: "研修プログラム設計",
      beforeProcess: "研修ニーズを手動ヒアリング→外部講師探し→カリキュラム手作成→資料準備",
      afterProcess: "AIがスキルギャップ分析→最適カリキュラム提案→研修資料ドラフト生成",
      beforeHours: 20, afterHours: 6, reductionPercent: 70,
      tools: ["カオナビ", "Udemy Business", "ChatGPT / Claude"],
      relatedChallenges: ["talent_shortage", "manual"],
    },
    {
      taskName: "eラーニング管理・効果測定",
      beforeProcess: "受講状況をExcelで手動管理→未受講者に個別催促→テスト結果を手動集計",
      afterProcess: "LMS自動トラッキング→未受講者自動リマインド→学習効果AIレポート",
      beforeHours: 12, afterHours: 3, reductionPercent: 75,
      tools: ["Schoo", "Udemy Business", "LMS"],
      relatedChallenges: ["manual", "reporting"],
    },
    {
      taskName: "OJT進捗管理・メンター支援",
      beforeProcess: "OJT計画を紙/Excelで管理→メンターに個別ヒアリング→進捗を手動で追跡",
      afterProcess: "OJT進捗を自動トラッキング→AIがつまずきポイント検知→メンターにアラート",
      beforeHours: 10, afterHours: 3, reductionPercent: 70,
      tools: ["カオナビ", "タレントパレット", "Notion AI"],
      relatedChallenges: ["manual", "talent_shortage"],
    },
  ],
  hr_evaluation: [
    {
      taskName: "評価シート配布・回収・集計",
      beforeProcess: "Excelの評価シートをメール配布→回収→手動集計→未提出者に催促",
      afterProcess: "クラウド評価システムで自動配布→回答自動集計→未提出者自動リマインド",
      beforeHours: 20, afterHours: 4, reductionPercent: 80,
      tools: ["カオナビ", "HRBrain", "SmartHR"],
      relatedChallenges: ["manual", "reporting"],
    },
    {
      taskName: "評価調整・人材配置シミュレーション",
      beforeProcess: "評価結果を一覧化→部門間バランスを手動調整→異動案を会議で検討",
      afterProcess: "AIが評価分布を自動可視化→公平性チェック→最適配置シミュレーション",
      beforeHours: 15, afterHours: 4, reductionPercent: 73,
      tools: ["タレントパレット", "カオナビ", "Anaplan"],
      relatedChallenges: ["slow_decision", "data_silo"],
    },
    {
      taskName: "サーベイ・エンゲージメント分析",
      beforeProcess: "アンケートをGoogleフォームで実施→結果を手動でExcel集計→レポート作成",
      afterProcess: "パルスサーベイ自動配信→AIがスコア分析→離職リスク予測→改善提案",
      beforeHours: 10, afterHours: 2, reductionPercent: 80,
      tools: ["Wevox", "モチベーションクラウド", "HRBrain"],
      relatedChallenges: ["reporting", "data_silo"],
    },
  ],
  general_affairs: [
    {
      taskName: "施設管理・備品発注",
      beforeProcess: "備品在庫を目視確認→発注書を手作成→見積比較→承認回覧→発注",
      afterProcess: "在庫センサー/IoT連携→AIが発注タイミング予測→最安値自動比較→ワンクリック発注",
      beforeHours: 12, afterHours: 3, reductionPercent: 75,
      tools: ["備品管理クラウド", "Amazonビジネス", "IoTセンサー"],
      relatedChallenges: ["manual", "cost_pressure"],
    },
    {
      taskName: "社内問い合わせ対応",
      beforeProcess: "メール/電話で問い合わせ受付→過去事例を調べて回答→履歴管理",
      afterProcess: "AIチャットボットが定型質問に即答→複雑案件のみ人が対応",
      beforeHours: 20, afterHours: 5, reductionPercent: 75,
      tools: ["ChatGPT Enterprise", "AI-FAQ", "PKSHA"],
      relatedChallenges: ["manual", "customer"],
    },
    {
      taskName: "会議室・車両予約管理",
      beforeProcess: "予約台帳を手動管理→ダブルブッキング発生→調整に時間",
      afterProcess: "クラウド予約システム→AIが利用パターン分析→最適化提案",
      beforeHours: 8, afterHours: 2, reductionPercent: 75,
      tools: ["RECEPTIONIST", "Google Workspace", "Outlook"],
      relatedChallenges: ["manual", "quality"],
    },
  ],

  // ── マーケティング ──────────────────────────
  digital_marketing: [
    {
      taskName: "広告運用・最適化",
      beforeProcess: "各広告管理画面で手動入札調整→レポート手動作成→A/Bテスト手動管理",
      afterProcess: "AI自動入札→クリエイティブ自動テスト→パフォーマンスレポート自動生成",
      beforeHours: 25, afterHours: 8, reductionPercent: 68,
      tools: ["Google AI", "Meta Advantage+", "Optmyzr"],
      relatedChallenges: ["manual", "data_silo"],
    },
    {
      taskName: "SEO分析・キーワード戦略",
      beforeProcess: "キーワードツールで手動リサーチ→競合分析→記事企画→効果測定",
      afterProcess: "AIがキーワード機会を自動発見→コンテンツギャップ分析→優先順位付け",
      beforeHours: 15, afterHours: 4, reductionPercent: 73,
      tools: ["Ahrefs AI", "SEMrush", "Surfer SEO"],
      relatedChallenges: ["manual", "slow_decision"],
    },
    {
      taskName: "Web解析・コンバージョン改善",
      beforeProcess: "GA4で手動分析→改善仮説を立てる→A/Bテスト設計→結果手動集計",
      afterProcess: "AI異常検知→改善ポイント自動提案→A/Bテスト自動最適化",
      beforeHours: 15, afterHours: 4, reductionPercent: 73,
      tools: ["GA4 AI", "Optimizely", "VWO"],
      relatedChallenges: ["data_silo", "reporting"],
    },
  ],
  content_sns: [
    {
      taskName: "記事・ブログ制作",
      beforeProcess: "ネタ出し→リサーチ→執筆→校正→画像作成→CMS入稿",
      afterProcess: "AIがトレンド分析→アウトライン生成→ドラフト執筆→人がレビュー・調整",
      beforeHours: 30, afterHours: 10, reductionPercent: 67,
      tools: ["ChatGPT / Claude", "Jasper", "WordPress AI"],
      relatedChallenges: ["manual", "talent_shortage"],
    },
    {
      taskName: "SNS投稿・スケジュール管理",
      beforeProcess: "投稿文面を毎回ゼロから作成→画像加工→各SNSに個別投稿→反応を手動チェック",
      afterProcess: "AIが投稿文面・ハッシュタグ提案→画像自動生成→一括予約投稿→効果自動分析",
      beforeHours: 20, afterHours: 5, reductionPercent: 75,
      tools: ["Buffer", "Canva AI", "Hootsuite"],
      relatedChallenges: ["manual", "reporting"],
    },
    {
      taskName: "動画コンテンツ制作",
      beforeProcess: "企画→撮影→手動編集→テロップ手付け→サムネ作成→アップロード",
      afterProcess: "AI自動文字起こし→テロップ自動生成→ハイライト自動抽出→サムネ提案",
      beforeHours: 15, afterHours: 5, reductionPercent: 67,
      tools: ["Premiere Pro AI", "Descript", "Canva"],
      relatedChallenges: ["manual", "talent_shortage"],
    },
  ],
  pr_communications: [
    {
      taskName: "プレスリリース作成・配信",
      beforeProcess: "原稿をゼロから執筆→社内校正回覧→配信先リスト手動管理→個別送付",
      afterProcess: "AIがドラフト生成→ファクトチェック支援→最適メディアリスト提案→一括配信",
      beforeHours: 20, afterHours: 6, reductionPercent: 70,
      tools: ["ChatGPT / Claude", "PR TIMES", "Meltwater"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "メディアモニタリング・クリッピング",
      beforeProcess: "ニュースサイト・新聞を毎日手動チェック→該当記事をExcelに記録→社内共有",
      afterProcess: "AIが自動モニタリング→関連記事を自動収集→サマリー生成→Slack通知",
      beforeHours: 12, afterHours: 2, reductionPercent: 83,
      tools: ["Meltwater", "日経テレコン", "Googleアラート"],
      relatedChallenges: ["manual", "data_silo"],
    },
    {
      taskName: "危機管理・広報対応",
      beforeProcess: "SNS炎上を手動で発見→対応方針を会議で検討→Q&A手作成→メディア対応",
      afterProcess: "AIがSNSリスクを自動検知→初期対応テンプレ即時提案→Q&A下書き生成",
      beforeHours: 8, afterHours: 2, reductionPercent: 75,
      tools: ["Social Insight", "Brandwatch", "ChatGPT"],
      relatedChallenges: ["quality", "slow_decision"],
    },
  ],
  crm_cx: [
    {
      taskName: "顧客セグメンテーション・分析",
      beforeProcess: "購買データをExcelで手動分析→RFM分析→セグメント定義→施策立案",
      afterProcess: "AIが自動クラスタリング→行動予測→LTV予測→最適施策レコメンド",
      beforeHours: 20, afterHours: 4, reductionPercent: 80,
      tools: ["Salesforce CDP", "Treasure Data", "Amplitude"],
      relatedChallenges: ["data_silo", "slow_decision"],
    },
    {
      taskName: "メールマーケティング最適化",
      beforeProcess: "セグメント手動抽出→文面作成→A/Bテスト設計→配信→効果測定",
      afterProcess: "AIセグメント自動最適化→パーソナライズ文面生成→最適タイミング配信",
      beforeHours: 15, afterHours: 4, reductionPercent: 73,
      tools: ["HubSpot AI", "Braze", "Klaviyo"],
      relatedChallenges: ["manual", "customer"],
    },
    {
      taskName: "NPS・顧客満足度分析",
      beforeProcess: "アンケートを手動配信→結果集計→自由回答を1件ずつ読む→改善施策立案",
      afterProcess: "自動サーベイ配信→AI感情分析→カテゴリ自動分類→改善優先度提案",
      beforeHours: 12, afterHours: 3, reductionPercent: 75,
      tools: ["Qualtrics", "SurveyMonkey", "ChatGPT"],
      relatedChallenges: ["reporting", "customer"],
    },
  ],

  // ── IT・情報システム ──────────────────────────
  it_infrastructure: [
    {
      taskName: "システム監視・障害対応",
      beforeProcess: "アラート確認→ログ分析→原因特定→対応手順書確認→復旧作業",
      afterProcess: "AI異常予兆検知→根本原因自動分析→復旧手順レコメンド→自動復旧",
      beforeHours: 30, afterHours: 8, reductionPercent: 73,
      tools: ["Datadog AI", "PagerDuty AIOps", "New Relic"],
      relatedChallenges: ["quality", "manual"],
    },
    {
      taskName: "サーバー・クラウドリソース管理",
      beforeProcess: "利用状況を手動モニタリング→スペック見直し→コスト最適化を手作業で検討",
      afterProcess: "AIがリソース使用パターン分析→自動スケーリング→コスト最適化提案",
      beforeHours: 15, afterHours: 4, reductionPercent: 73,
      tools: ["AWS Cost Explorer", "Azure Advisor", "Spot by NetApp"],
      relatedChallenges: ["cost_pressure", "manual"],
    },
    {
      taskName: "バックアップ・DR運用",
      beforeProcess: "バックアップジョブを手動監視→テストリストアを定期実施→DR計画を手動更新",
      afterProcess: "バックアップ成否自動監視→AIリストアテスト→DR計画自動更新提案",
      beforeHours: 10, afterHours: 3, reductionPercent: 70,
      tools: ["Veeam", "AWS Backup", "Commvault"],
      relatedChallenges: ["quality", "manual"],
    },
  ],
  helpdesk: [
    {
      taskName: "社内問い合わせ対応",
      beforeProcess: "チケット受付→過去事例検索→手動回答→エスカレーション判断",
      afterProcess: "AIが自動分類→既知問題は即答→未知問題のみエスカレーション",
      beforeHours: 35, afterHours: 10, reductionPercent: 71,
      tools: ["ServiceNow AI", "Zendesk AI", "PKSHA"],
      relatedChallenges: ["manual", "customer"],
    },
    {
      taskName: "PC・アカウント管理",
      beforeProcess: "入退社時にPC手配→アカウント手動作成/削除→各SaaSに個別設定",
      afterProcess: "入退社トリガーでアカウント自動プロビジョニング→PC自動セットアップ",
      beforeHours: 15, afterHours: 3, reductionPercent: 80,
      tools: ["Okta", "Jamf", "Intune"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "ナレッジベース・FAQ管理",
      beforeProcess: "手順書を手動作成→更新忘れ→新人が古い手順を参照→事故",
      afterProcess: "AI自動ドキュメント生成→変更検知で自動更新→チャットで検索可能",
      beforeHours: 15, afterHours: 4, reductionPercent: 73,
      tools: ["Notion AI", "Confluence AI", "GitBook"],
      relatedChallenges: ["manual", "data_silo", "quality"],
    },
  ],
  it_security: [
    {
      taskName: "セキュリティ監視・インシデント対応",
      beforeProcess: "SIEMアラートを手動確認→誤検知の振り分け→インシデント調査→報告書作成",
      afterProcess: "AI自動トリアージ→誤検知自動フィルタ→インシデント自動調査→レポート生成",
      beforeHours: 25, afterHours: 8, reductionPercent: 68,
      tools: ["CrowdStrike", "Microsoft Sentinel", "Splunk SOAR"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "脆弱性管理・パッチ適用",
      beforeProcess: "脆弱性スキャン結果を手動確認→影響度を手動評価→パッチ適用計画作成",
      afterProcess: "AI脆弱性優先度スコアリング→影響範囲自動分析→パッチ適用を自動スケジュール",
      beforeHours: 15, afterHours: 4, reductionPercent: 73,
      tools: ["Tenable", "Qualys", "Snyk"],
      relatedChallenges: ["quality", "manual"],
    },
    {
      taskName: "アクセス権限レビュー",
      beforeProcess: "権限一覧をExcelで手動管理→定期棚卸しで部門ヒアリング→不要権限を個別削除",
      afterProcess: "AI権限利用分析→不要権限を自動検出→承認ワークフローで一括処理",
      beforeHours: 12, afterHours: 3, reductionPercent: 75,
      tools: ["SailPoint", "Okta", "CyberArk"],
      relatedChallenges: ["quality", "manual", "data_silo"],
    },
  ],
  system_dev: [
    {
      taskName: "要件定義・仕様書作成",
      beforeProcess: "ヒアリングメモから手動で要件書作成→レビュー回覧→修正の繰り返し",
      afterProcess: "AIが議事録から要件抽出→仕様書ドラフト自動生成→差分レビュー支援",
      beforeHours: 25, afterHours: 8, reductionPercent: 68,
      tools: ["ChatGPT / Claude", "Notion AI", "Copilot"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "コードレビュー・品質管理",
      beforeProcess: "プルリクエストを手動レビュー→指摘コメント→修正確認→テスト結果確認",
      afterProcess: "AI自動コードレビュー→バグ・脆弱性を自動検出→修正提案→テスト自動生成",
      beforeHours: 20, afterHours: 6, reductionPercent: 70,
      tools: ["GitHub Copilot", "SonarQube", "CodeRabbit"],
      relatedChallenges: ["quality", "manual"],
    },
    {
      taskName: "ベンダー管理・進捗管理",
      beforeProcess: "週次ミーティングで進捗確認→議事録手作成→課題管理表を手動更新",
      afterProcess: "プロジェクト管理ツール自動連携→AI進捗サマリー→リスク自動検知",
      beforeHours: 12, afterHours: 4, reductionPercent: 67,
      tools: ["Jira AI", "Notion AI", "Asana"],
      relatedChallenges: ["reporting", "slow_decision"],
    },
  ],

  // ── 業務・オペレーション ──────────────────────────
  order_management: [
    {
      taskName: "受注処理・入力",
      beforeProcess: "FAX/メールで受注→手動でシステム入力→在庫確認→受注確認書作成",
      afterProcess: "AI-OCRで注文書読取→自動入力→在庫自動確認→確認書自動送信",
      beforeHours: 30, afterHours: 6, reductionPercent: 80,
      tools: ["AI-OCR", "受発注自動化ツール", "RPA"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "発注書作成・サプライヤー管理",
      beforeProcess: "在庫を確認→発注量を経験則で決定→発注書手作成→サプライヤーにFAX/メール",
      afterProcess: "AI需要予測→最適発注量自動計算→発注書自動生成→EDI自動送信",
      beforeHours: 20, afterHours: 4, reductionPercent: 80,
      tools: ["SAP Ariba", "coupa", "EDI連携"],
      relatedChallenges: ["manual", "cost_pressure"],
    },
    {
      taskName: "納期管理・出荷手配",
      beforeProcess: "納期をExcelで手動追跡→遅延を電話で個別確認→出荷指示を手作業",
      afterProcess: "納期AI自動追跡→遅延リスク予測アラート→出荷指示自動生成",
      beforeHours: 15, afterHours: 4, reductionPercent: 73,
      tools: ["WMS", "TMS", "SAP"],
      relatedChallenges: ["manual", "quality", "customer"],
    },
  ],
  inventory_logistics: [
    {
      taskName: "在庫管理・需要予測",
      beforeProcess: "Excel管理→経験則で発注量決定→欠品/過剰在庫が発生",
      afterProcess: "AI需要予測→適正在庫量自動算出→発注タイミングアラート",
      beforeHours: 20, afterHours: 4, reductionPercent: 80,
      tools: ["DEMAND WORKS", "Forecast Pro", "SAP IBP"],
      relatedChallenges: ["data_silo", "slow_decision", "cost_pressure"],
    },
    {
      taskName: "倉庫管理・ピッキング最適化",
      beforeProcess: "ロケーション手動管理→ピッキングリスト手書き→動線非効率→棚卸しに大量時間",
      afterProcess: "WMSで自動ロケーション管理→AIピッキング動線最適化→ドローン/ロボット棚卸し",
      beforeHours: 25, afterHours: 8, reductionPercent: 68,
      tools: ["WMS", "AutoStore", "Locus Robotics"],
      relatedChallenges: ["manual", "cost_pressure"],
    },
    {
      taskName: "配送ルート・コスト最適化",
      beforeProcess: "配送ルートを手動計画→ドライバーに個別指示→コストを後から集計",
      afterProcess: "AI配送ルート自動最適化→リアルタイム調整→コスト自動分析",
      beforeHours: 15, afterHours: 4, reductionPercent: 73,
      tools: ["Logi-Solution", "Route4Me", "Optafleet"],
      relatedChallenges: ["cost_pressure", "manual"],
    },
  ],
  quality_management: [
    {
      taskName: "検品・品質検査",
      beforeProcess: "目視検査→チェックシートに手書き記入→集計→不良率レポート",
      afterProcess: "AI画像認識で自動検品→データ自動記録→不良予兆アラート",
      beforeHours: 30, afterHours: 8, reductionPercent: 73,
      tools: ["画像認識AI", "品質管理SaaS", "IoTセンサー"],
      relatedChallenges: ["quality", "manual", "cost_pressure"],
    },
    {
      taskName: "品質データ分析・改善",
      beforeProcess: "不良データをExcelで手動集計→パレート分析→原因調査→改善施策立案",
      afterProcess: "AIが不良パターン自動分析→根本原因推定→改善施策レコメンド",
      beforeHours: 15, afterHours: 4, reductionPercent: 73,
      tools: ["Minitab", "JMP", "Power BI"],
      relatedChallenges: ["data_silo", "quality"],
    },
    {
      taskName: "トレーサビリティ管理",
      beforeProcess: "ロット番号を紙/Excelで管理→問題発生時に手動で追跡→対象製品特定に数日",
      afterProcess: "QRコード/RFID自動追跡→AI瞬時にロット追跡→影響範囲即座に特定",
      beforeHours: 10, afterHours: 2, reductionPercent: 80,
      tools: ["TraceLink", "SAP QM", "IoTタグ"],
      relatedChallenges: ["quality", "manual"],
    },
  ],
  customer_support: [
    {
      taskName: "問い合わせ対応・チケット管理",
      beforeProcess: "メール/電話で受付→チケット手動作成→過去事例検索→回答作成",
      afterProcess: "AIが自動分類→回答候補生成→定型は自動返信→人は複雑案件に集中",
      beforeHours: 35, afterHours: 10, reductionPercent: 71,
      tools: ["Zendesk AI", "Intercom", "ChatGPT"],
      relatedChallenges: ["manual", "customer"],
    },
    {
      taskName: "FAQ・ナレッジ管理",
      beforeProcess: "よくある質問を手動で整理→更新忘れ→オペレーターが古い情報を案内",
      afterProcess: "AIが問い合わせ傾向から自動FAQ生成→回答品質を自動チェック→常に最新",
      beforeHours: 10, afterHours: 2, reductionPercent: 80,
      tools: ["Helpfeel", "Notion AI", "PKSHA"],
      relatedChallenges: ["quality", "data_silo"],
    },
    {
      taskName: "VOC分析・改善提案",
      beforeProcess: "クレーム・要望をExcelで手動分類→月次レポート作成→改善会議で報告",
      afterProcess: "AIが全問い合わせを感情分析・カテゴリ分類→トレンド自動可視化→改善提案",
      beforeHours: 12, afterHours: 3, reductionPercent: 75,
      tools: ["Qualtrics", "Medallia", "TextAnalytics AI"],
      relatedChallenges: ["reporting", "customer"],
    },
  ],

  // ── 法務・コンプライアンス ──────────────────────────
  contract_management: [
    {
      taskName: "契約書レビュー",
      beforeProcess: "契約書を1条ずつ目視確認→過去契約との比較→リスク指摘をWord赤入れ",
      afterProcess: "AIが自動レビュー→リスク条項ハイライト→修正案提示→人が最終判断",
      beforeHours: 25, afterHours: 6, reductionPercent: 76,
      tools: ["LegalForce", "LAWGUE", "AI契約レビュー"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "契約書作成・テンプレート管理",
      beforeProcess: "過去の契約書をコピー→条件に合わせて手動修正→漏れがないかチェック",
      afterProcess: "AIが条件入力から契約書を自動生成→必須条項チェック→バージョン管理",
      beforeHours: 15, afterHours: 4, reductionPercent: 73,
      tools: ["LegalForce", "Hubble", "CloudSign"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "契約台帳・期限管理",
      beforeProcess: "Excelで契約一覧管理→更新期限を手動チェック→見落としリスク",
      afterProcess: "AIが契約書から自動で台帳作成→更新期限アラート→関連契約レコメンド",
      beforeHours: 10, afterHours: 2, reductionPercent: 80,
      tools: ["Hubble", "ContractS", "クラウドサイン"],
      relatedChallenges: ["data_silo", "manual"],
    },
  ],
  compliance: [
    {
      taskName: "法改正モニタリング・影響分析",
      beforeProcess: "官報・業界誌を定期チェック→影響範囲を手動で評価→社内周知",
      afterProcess: "AIが自動モニタリング→自社影響度を自動評価→対応アクション提案",
      beforeHours: 15, afterHours: 3, reductionPercent: 80,
      tools: ["FRONTEO", "リーガルテックAI", "ChatGPT"],
      relatedChallenges: ["manual", "slow_decision"],
    },
    {
      taskName: "内部監査・統制チェック",
      beforeProcess: "監査チェックリストを手動確認→証跡収集→監査報告書手作成",
      afterProcess: "AIが自動で統制テスト→証跡を自動収集→監査報告書ドラフト生成",
      beforeHours: 20, afterHours: 6, reductionPercent: 70,
      tools: ["ACL", "Diligent", "内部監査AI"],
      relatedChallenges: ["manual", "reporting", "quality"],
    },
    {
      taskName: "コンプライアンス研修・記録管理",
      beforeProcess: "研修資料を手動作成→受講記録をExcel管理→未受講者に個別催促",
      afterProcess: "AIが最新法令に基づき研修自動更新→受講自動トラッキング→自動リマインド",
      beforeHours: 10, afterHours: 3, reductionPercent: 70,
      tools: ["LMS", "Schoo", "SmartHR"],
      relatedChallenges: ["manual", "talent_shortage"],
    },
  ],
  ip_management: [
    {
      taskName: "特許・商標出願管理",
      beforeProcess: "出願書類を手動作成→期限管理をExcelで追跡→海外出願の翻訳手配",
      afterProcess: "AIが先行技術調査→出願書類ドラフト生成→期限自動管理→翻訳AI連携",
      beforeHours: 20, afterHours: 6, reductionPercent: 70,
      tools: ["PatSnap", "Clarivate", "DeepL / ChatGPT"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "権利侵害モニタリング",
      beforeProcess: "定期的にWeb/市場を手動チェック→類似商品発見時に手動で証拠収集",
      afterProcess: "AI自動モニタリング→類似製品/商標を自動検出→証拠自動保全→法務にアラート",
      beforeHours: 10, afterHours: 2, reductionPercent: 80,
      tools: ["TrademarkNow", "CompuMark", "AI監視ツール"],
      relatedChallenges: ["manual", "data_silo"],
    },
    {
      taskName: "ライセンス管理・ロイヤリティ計算",
      beforeProcess: "ライセンス契約をExcelで管理→ロイヤリティを手動計算→支払い管理",
      afterProcess: "ライセンス台帳自動管理→ロイヤリティ自動計算→支払いアラート",
      beforeHours: 8, afterHours: 2, reductionPercent: 75,
      tools: ["Anaqua", "IP管理SaaS", "Copilot"],
      relatedChallenges: ["manual", "quality"],
    },
  ],

  // ── 経営企画 ──────────────────────────
  corporate_strategy: [
    {
      taskName: "市場調査・競合分析",
      beforeProcess: "Web検索→レポート購入→手動で整理→PowerPointにまとめ",
      afterProcess: "AIが自動で情報収集→競合動向サマリー生成→トレンド分析レポート",
      beforeHours: 25, afterHours: 6, reductionPercent: 76,
      tools: ["Perplexity", "Claude / ChatGPT", "SPEEDA"],
      relatedChallenges: ["manual", "slow_decision"],
    },
    {
      taskName: "中期経営計画策定支援",
      beforeProcess: "各部門からデータ収集→仮説検証→シナリオ手動作成→整合性チェック→資料化",
      afterProcess: "AIがデータ自動統合→シナリオ自動生成→感度分析→計画書ドラフト生成",
      beforeHours: 30, afterHours: 8, reductionPercent: 73,
      tools: ["Anaplan", "Copilot", "SPEEDA"],
      relatedChallenges: ["slow_decision", "data_silo", "reporting"],
    },
    {
      taskName: "事業ポートフォリオ分析",
      beforeProcess: "各事業のKPIをExcelで手動整理→BCGマトリクス手作成→経営会議資料化",
      afterProcess: "AIがKPI自動集約→ポートフォリオ分析→最適リソース配分提案",
      beforeHours: 15, afterHours: 4, reductionPercent: 73,
      tools: ["Tableau", "Power BI", "Copilot"],
      relatedChallenges: ["data_silo", "slow_decision"],
    },
  ],
  corporate_management: [
    {
      taskName: "経営レポート・ダッシュボード",
      beforeProcess: "各部門からデータ収集→Excel統合→グラフ作成→考察記入→役員会資料化",
      afterProcess: "全データ自動統合→AIダッシュボード→異常値アラート→コメント自動生成",
      beforeHours: 30, afterHours: 6, reductionPercent: 80,
      tools: ["Tableau / Power BI", "Copilot", "Domo"],
      relatedChallenges: ["reporting", "data_silo", "slow_decision"],
    },
    {
      taskName: "取締役会資料作成",
      beforeProcess: "各部門から報告を収集→統合→フォーマット調整→印刷・配布",
      afterProcess: "報告データ自動集約→AIがサマリー生成→フォーマット自動整形→Web配信",
      beforeHours: 20, afterHours: 5, reductionPercent: 75,
      tools: ["Copilot", "Notion AI", "Board管理SaaS"],
      relatedChallenges: ["manual", "reporting"],
    },
    {
      taskName: "IR資料・開示資料作成",
      beforeProcess: "財務データ手動集計→開示フォーマットに転記→法的チェック→翻訳手配",
      afterProcess: "財務データ自動連携→AIが開示資料ドラフト生成→法的チェック支援→翻訳AI",
      beforeHours: 20, afterHours: 6, reductionPercent: 70,
      tools: ["PRONEXUS", "Copilot", "DeepL"],
      relatedChallenges: ["manual", "quality", "reporting"],
    },
  ],
  ma_bd: [
    {
      taskName: "ターゲット企業スクリーニング",
      beforeProcess: "業界レポートを手動リサーチ→候補リスト作成→財務データ手動収集→初期評価",
      afterProcess: "AIが条件に合致する企業を自動スクリーニング→財務・ニュース自動収集→評価",
      beforeHours: 25, afterHours: 6, reductionPercent: 76,
      tools: ["SPEEDA", "Capital IQ", "Perplexity"],
      relatedChallenges: ["manual", "slow_decision"],
    },
    {
      taskName: "デューデリジェンス支援",
      beforeProcess: "大量の開示資料を手動レビュー→リスク抽出→チェックリスト消込→報告書作成",
      afterProcess: "AI文書解析→リスク条項自動抽出→チェックリスト自動消込→報告書ドラフト",
      beforeHours: 30, afterHours: 10, reductionPercent: 67,
      tools: ["Kira Systems", "LegalForce", "Claude"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "バリュエーション・シナリオ分析",
      beforeProcess: "Excelで複数シナリオ手動作成→DCF/マルチプル計算→感度分析表作成",
      afterProcess: "AIがシナリオ自動生成→計算自動化→感度分析→最適価格帯提案",
      beforeHours: 20, afterHours: 6, reductionPercent: 70,
      tools: ["Anaplan", "Copilot for Excel", "Capital IQ"],
      relatedChallenges: ["slow_decision", "data_silo"],
    },
  ],
  new_business: [
    {
      taskName: "市場機会の調査・分析",
      beforeProcess: "Web検索→業界レポート購入→手動でデータ整理→市場規模推定",
      afterProcess: "AIが自動で市場データ収集→TAM/SAM/SOM自動推定→競合マップ生成",
      beforeHours: 25, afterHours: 6, reductionPercent: 76,
      tools: ["Perplexity", "SPEEDA", "ChatGPT / Claude"],
      relatedChallenges: ["manual", "slow_decision"],
    },
    {
      taskName: "事業計画書・ピッチ資料作成",
      beforeProcess: "財務モデルをExcelで手動作成→PowerPointで資料化→社内レビュー繰り返し",
      afterProcess: "AIが財務モデルテンプレ生成→ピッチ資料ドラフト作成→フィードバック反映支援",
      beforeHours: 20, afterHours: 6, reductionPercent: 70,
      tools: ["Gamma", "Copilot", "Beautiful.ai"],
      relatedChallenges: ["manual", "reporting"],
    },
    {
      taskName: "PoC・プロトタイプ検証",
      beforeProcess: "仮説を手動で検証計画→顧客ヒアリング手配→結果を手動集計→Go/No-Go判断",
      afterProcess: "AIがプロトタイプ自動生成→ユーザーテスト効率化→結果AI分析→判断支援",
      beforeHours: 15, afterHours: 5, reductionPercent: 67,
      tools: ["Figma AI", "Maze", "Amplitude"],
      relatedChallenges: ["slow_decision", "talent_shortage"],
    },
  ],
};

// ===== 計算ロジック =====

const SIZE_MULTIPLIER: Record<string, number> = {
  small: 0.5,
  medium: 1.0,
  large: 1.8,
  enterprise: 3.0,
};

const HOURLY_COST = 5000; // 円/時間（平均ホワイトカラー人件費）

export function calculateDiagnosis(input: DiagnosisInput): DiagnosisResult {
  // 業務（function）ベースでワークフローを取得
  const baseWorkflows = FUNCTION_WORKFLOWS[input.businessFunction] || [];

  // フォールバック: functionが見つからない場合、同じ部署の最初のfunctionを使用
  const finalWorkflows = baseWorkflows.length > 0
    ? baseWorkflows
    : (() => {
        const funcs = DEPARTMENT_FUNCTIONS[input.department];
        if (funcs && funcs.length > 0) {
          return FUNCTION_WORKFLOWS[funcs[0].id] || [];
        }
        return [];
      })();

  const multiplier = SIZE_MULTIPLIER[input.companySize] || 1.0;

  // 課題に合致するワークフローを優先、その他も含める
  const scoredWorkflows = finalWorkflows.map((wf) => {
    const challengeMatch = wf.relatedChallenges.filter((c) =>
      input.challenges.includes(c)
    ).length;
    // システム状況によるボーナス
    let systemBonus = 0;
    if (input.systems.includes("paper") || input.systems.includes("excel")) {
      systemBonus = 5; // 紙/Excel中心なら改善余地が大きい
    }
    if (input.systems.includes("erp") || input.systems.includes("crm")) {
      systemBonus += 3; // 既存システムがあればAPI連携で効果UP
    }
    return {
      ...wf,
      beforeHours: Math.round(wf.beforeHours * multiplier),
      afterHours: Math.round(wf.afterHours * multiplier),
      reductionPercent: Math.min(95, wf.reductionPercent + systemBonus),
      priority: challengeMatch * 2 + (systemBonus > 0 ? 1 : 0),
    };
  });

  // 優先度順にソート
  scoredWorkflows.sort((a, b) => b.priority - a.priority);

  const workflows: WorkflowItem[] = scoredWorkflows.map(({ priority: _p, ...wf }) => wf);

  // 合計計算
  const totalBeforeHours = workflows.reduce((sum, wf) => sum + wf.beforeHours, 0);
  const totalAfterHours = workflows.reduce((sum, wf) => sum + wf.afterHours, 0);
  const hoursSaved = totalBeforeHours - totalAfterHours;
  const automationPotential = totalBeforeHours > 0
    ? Math.round((hoursSaved / totalBeforeHours) * 100)
    : 0;

  // 推奨アクション生成
  const recommendations = generateRecommendations(input, workflows);

  const deptItem = DEPARTMENTS.find((d) => d.id === input.department);
  const sizeItem = COMPANY_SIZES.find((s) => s.id === input.companySize);
  const funcItems = DEPARTMENT_FUNCTIONS[input.department] || [];
  const funcItem = funcItems.find((f) => f.id === input.businessFunction);

  return {
    estimatedHoursSaved: hoursSaved,
    estimatedCostSaved: Math.round((hoursSaved * HOURLY_COST * 12) / 10000), // 万円/年
    automationPotential,
    workflows,
    recommendations,
    departmentLabel: deptItem?.label || "",
    functionLabel: funcItem?.label || "",
    companySizeLabel: sizeItem?.label || "",
  };
}

function generateRecommendations(
  input: DiagnosisInput,
  workflows: WorkflowItem[]
): Recommendation[] {
  const recs: Recommendation[] = [];

  // 最も効果の大きいワークフローから推奨
  if (workflows.length > 0) {
    const top = workflows[0];
    recs.push({
      title: `${top.taskName}のAI自動化から着手`,
      description: `最も削減効果が大きい「${top.taskName}」から始めることで、月間${top.beforeHours - top.afterHours}時間の削減を早期に実現できます。`,
      impact: "high",
      timeframe: "1-2ヶ月",
    });
  }

  if (input.challenges.includes("data_silo")) {
    recs.push({
      title: "データ統合基盤の構築",
      description: "バラバラなデータを統合することで、AIの分析精度が飛躍的に向上します。まずは主要データソースの連携から。",
      impact: "high",
      timeframe: "2-3ヶ月",
    });
  }

  if (input.challenges.includes("talent_shortage")) {
    recs.push({
      title: "外部DXコンサルタントの活用",
      description: "社内にDX人材がいない場合、PERSONAのフリーコンサルタントを活用することで、短期間でAI導入を推進できます。",
      impact: "high",
      timeframe: "2週間〜",
    });
  }

  if (input.systems.includes("paper") || input.systems.includes("excel")) {
    recs.push({
      title: "ペーパーレス化・クラウド移行",
      description: "AI活用の前提として、紙やExcelのデータをクラウドに移行することで、自動化の対象範囲が大幅に拡がります。",
      impact: "medium",
      timeframe: "1-3ヶ月",
    });
  }

  if (input.challenges.includes("quality")) {
    recs.push({
      title: "AIによるダブルチェック体制の導入",
      description: "人の作業をAIが検証する体制を構築し、ヒューマンエラーを大幅に削減できます。",
      impact: "medium",
      timeframe: "1-2ヶ月",
    });
  }

  // 常に最後に追加
  recs.push({
    title: "AI導入効果の詳細アセスメント",
    description: "より正確なROI分析と具体的な導入ロードマップの策定には、PERSONAの専門コンサルタントによるアセスメントをお勧めします。",
    impact: "high",
    timeframe: "1-2週間",
  });

  return recs.slice(0, 5);
}
