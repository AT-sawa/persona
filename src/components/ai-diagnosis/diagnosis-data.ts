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

// ===== Step 2: 規模 =====
export const COMPANY_SIZES = [
  { id: "small", label: "〜50名", description: "スタートアップ・中小企業" },
  { id: "medium", label: "51〜300名", description: "中堅企業" },
  { id: "large", label: "301〜1,000名", description: "大企業" },
  { id: "enterprise", label: "1,001名以上", description: "大手エンタープライズ" },
] as const;

// ===== Step 3: 利用中システム =====
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

// ===== Step 4: 課題 =====
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
  companySizeLabel: string;
}

// ===== 部署別ベースワークフロー =====
const DEPARTMENT_WORKFLOWS: Record<string, WorkflowItem[]> = {
  sales: [
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
      taskName: "顧客データ分析・アプローチリスト作成",
      beforeProcess: "Excelで手動集計→属性ごとにフィルタ→経験則でリスト作成",
      afterProcess: "AIが受注確度を予測→優先度付きリスト自動生成→アプローチ文面提案",
      beforeHours: 15, afterHours: 3, reductionPercent: 80,
      tools: ["Salesforce / HubSpot AI", "FORCAS"],
      relatedChallenges: ["data_silo", "slow_decision"],
    },
    {
      taskName: "日報・週報作成",
      beforeProcess: "活動内容を思い出しながらExcelやメールで報告書作成",
      afterProcess: "CRM活動ログから自動で日報ドラフト生成→確認・送信",
      beforeHours: 10, afterHours: 2, reductionPercent: 80,
      tools: ["Copilot", "日報AI"],
      relatedChallenges: ["manual", "reporting"],
    },
  ],
  finance: [
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
      taskName: "月次レポート・決算資料作成",
      beforeProcess: "複数システムからデータ手動集計→Excel加工→グラフ作成→報告書化",
      afterProcess: "データ自動集計→AIがコメント・分析生成→レポート自動配信",
      beforeHours: 24, afterHours: 6, reductionPercent: 75,
      tools: ["Copilot for Finance", "Tableau / Power BI"],
      relatedChallenges: ["reporting", "slow_decision", "data_silo"],
    },
    {
      taskName: "入金消込・債権管理",
      beforeProcess: "銀行明細と請求書を手動突合→未入金リスト作成→督促メール作成",
      afterProcess: "AI自動マッチング→未入金アラート→督促メール自動生成",
      beforeHours: 15, afterHours: 3, reductionPercent: 80,
      tools: ["V-ONEクラウド", "請求管理ロボ"],
      relatedChallenges: ["manual", "quality"],
    },
  ],
  hr: [
    {
      taskName: "採用書類スクリーニング",
      beforeProcess: "履歴書・職務経歴書を1件ずつ目視確認→Excelに評価記入→面接候補選定",
      afterProcess: "AIが書類を自動スコアリング→要件適合度ランキング→面接候補を推薦",
      beforeHours: 30, afterHours: 6, reductionPercent: 80,
      tools: ["HERP", "HRMOS", "AI採用ツール"],
      relatedChallenges: ["manual", "talent_shortage"],
    },
    {
      taskName: "勤怠・給与計算",
      beforeProcess: "タイムカード集計→Excel計算→給与ソフトに手入力→明細作成",
      afterProcess: "勤怠データ自動集計→AI異常検知→給与自動計算→明細自動配信",
      beforeHours: 25, afterHours: 5, reductionPercent: 80,
      tools: ["SmartHR", "freee人事労務", "ジョブカン"],
      relatedChallenges: ["manual", "quality"],
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
      taskName: "研修・評価資料作成",
      beforeProcess: "研修計画を手動作成→評価シート配布→回収→集計→フィードバック作成",
      afterProcess: "AI研修プラン提案→オンライン評価自動集計→フィードバック文案生成",
      beforeHours: 15, afterHours: 4, reductionPercent: 73,
      tools: ["カオナビ", "タレントパレット"],
      relatedChallenges: ["reporting", "talent_shortage"],
    },
  ],
  marketing: [
    {
      taskName: "コンテンツ制作（記事・SNS投稿）",
      beforeProcess: "ネタ出し→リサーチ→執筆→校正→画像作成→投稿",
      afterProcess: "AIがトレンド分析→ドラフト生成→人がレビュー・調整→自動投稿スケジュール",
      beforeHours: 40, afterHours: 12, reductionPercent: 70,
      tools: ["ChatGPT / Claude", "Canva AI", "Buffer"],
      relatedChallenges: ["manual", "talent_shortage"],
    },
    {
      taskName: "データ分析・レポーティング",
      beforeProcess: "GA・広告管理画面からデータ手動抽出→Excel加工→グラフ化→考察記入",
      afterProcess: "AIがデータ自動統合→異常値検知→インサイト生成→レポート自動配信",
      beforeHours: 20, afterHours: 4, reductionPercent: 80,
      tools: ["Looker Studio + AI", "GA4 AI分析", "Copilot"],
      relatedChallenges: ["data_silo", "reporting", "slow_decision"],
    },
    {
      taskName: "メールマーケティング",
      beforeProcess: "セグメント手動抽出→文面作成→A/Bテスト設計→配信→効果測定",
      afterProcess: "AIセグメント自動最適化→パーソナライズ文面生成→最適タイミング配信",
      beforeHours: 15, afterHours: 4, reductionPercent: 73,
      tools: ["HubSpot AI", "Braze", "SendGrid"],
      relatedChallenges: ["manual", "customer"],
    },
  ],
  it: [
    {
      taskName: "ヘルプデスク・問い合わせ対応",
      beforeProcess: "チケット受付→過去事例検索→手動回答→エスカレーション判断",
      afterProcess: "AIが自動分類→既知問題は即答→未知問題のみエスカレーション",
      beforeHours: 40, afterHours: 12, reductionPercent: 70,
      tools: ["ServiceNow AI", "Zendesk AI", "PKSHA"],
      relatedChallenges: ["manual", "customer"],
    },
    {
      taskName: "システム監視・障害対応",
      beforeProcess: "アラート確認→ログ分析→原因特定→対応手順書確認→復旧作業",
      afterProcess: "AI異常予兆検知→根本原因自動分析→復旧手順レコメンド→自動復旧",
      beforeHours: 25, afterHours: 8, reductionPercent: 68,
      tools: ["Datadog AI", "PagerDuty AIOps", "New Relic"],
      relatedChallenges: ["quality", "manual"],
    },
    {
      taskName: "ドキュメント作成・ナレッジ管理",
      beforeProcess: "手順書を手動作成→更新忘れ→新人が古い手順を参照→事故",
      afterProcess: "AI自動ドキュメント生成→変更検知で自動更新→チャットで検索可能",
      beforeHours: 20, afterHours: 5, reductionPercent: 75,
      tools: ["Notion AI", "Confluence AI", "GitBook"],
      relatedChallenges: ["manual", "data_silo", "quality"],
    },
  ],
  operations: [
    {
      taskName: "受発注処理",
      beforeProcess: "FAX/メールで受注→手動でシステム入力→在庫確認→発注書作成",
      afterProcess: "AI-OCRで注文書読取→自動入力→在庫AI予測→発注書自動生成",
      beforeHours: 35, afterHours: 8, reductionPercent: 77,
      tools: ["AI-OCR", "受発注自動化ツール"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "在庫管理・需要予測",
      beforeProcess: "Excel管理→経験則で発注量決定→欠品/過剰在庫が発生",
      afterProcess: "AI需要予測→適正在庫量自動算出→発注タイミングアラート",
      beforeHours: 20, afterHours: 4, reductionPercent: 80,
      tools: ["DEMAND WORKS", "Forecast Pro"],
      relatedChallenges: ["data_silo", "slow_decision", "cost_pressure"],
    },
    {
      taskName: "品質チェック・検品",
      beforeProcess: "目視検査→チェックシートに手書き記入→集計→不良率レポート",
      afterProcess: "AI画像認識で自動検品→データ自動記録→不良予兆アラート",
      beforeHours: 30, afterHours: 8, reductionPercent: 73,
      tools: ["画像認識AI", "品質管理SaaS"],
      relatedChallenges: ["quality", "manual", "cost_pressure"],
    },
  ],
  legal: [
    {
      taskName: "契約書レビュー",
      beforeProcess: "契約書を1条ずつ目視確認→過去契約との比較→リスク指摘をWord赤入れ",
      afterProcess: "AIが自動レビュー→リスク条項ハイライト→修正案提示→人が最終判断",
      beforeHours: 30, afterHours: 8, reductionPercent: 73,
      tools: ["LegalForce", "LAWGUE", "AI契約レビュー"],
      relatedChallenges: ["manual", "quality"],
    },
    {
      taskName: "法改正・規制対応モニタリング",
      beforeProcess: "官報・業界誌を定期チェック→影響範囲を手動で評価→社内周知",
      afterProcess: "AIが自動モニタリング→自社影響度を自動評価→対応アクション提案",
      beforeHours: 15, afterHours: 3, reductionPercent: 80,
      tools: ["FRONTEO", "リーガルテックAI"],
      relatedChallenges: ["manual", "slow_decision"],
    },
    {
      taskName: "契約書管理・検索",
      beforeProcess: "ファイルサーバーに格納→探すときはフォルダを手動検索→見つからず問い合わせ",
      afterProcess: "AIが契約書を自動分類→全文検索→期限管理アラート→関連契約レコメンド",
      beforeHours: 10, afterHours: 2, reductionPercent: 80,
      tools: ["Hubble", "クラウドサイン", "ContractS"],
      relatedChallenges: ["data_silo", "manual"],
    },
  ],
  management: [
    {
      taskName: "経営レポート・ダッシュボード作成",
      beforeProcess: "各部門からデータ収集→Excel統合→グラフ作成→考察記入→役員会資料化",
      afterProcess: "全データ自動統合→AIダッシュボード→異常値アラート→コメント自動生成",
      beforeHours: 30, afterHours: 6, reductionPercent: 80,
      tools: ["Tableau / Power BI", "Copilot", "Domo"],
      relatedChallenges: ["reporting", "data_silo", "slow_decision"],
    },
    {
      taskName: "市場調査・競合分析",
      beforeProcess: "Web検索→レポート購入→手動で整理→PowerPointにまとめ",
      afterProcess: "AIが自動で情報収集→競合動向サマリー生成→トレンド分析レポート",
      beforeHours: 25, afterHours: 6, reductionPercent: 76,
      tools: ["Perplexity", "Claude / ChatGPT", "SPEEDA"],
      relatedChallenges: ["manual", "slow_decision"],
    },
    {
      taskName: "会議資料・議事録",
      beforeProcess: "各部門に資料依頼→統合→議事録作成→アクションアイテム管理",
      afterProcess: "AI音声文字起こし→要点自動抽出→アクションアイテム自動リスト化",
      beforeHours: 15, afterHours: 4, reductionPercent: 73,
      tools: ["Otter.ai", "CLOVA Note", "Notion AI"],
      relatedChallenges: ["manual", "reporting"],
    },
    {
      taskName: "事業計画シミュレーション",
      beforeProcess: "Excelで複数シナリオを手動作成→変数変更のたびに再計算→整合性チェック",
      afterProcess: "AIがシナリオ自動生成→感度分析→最適シナリオ提案→自動レポート",
      beforeHours: 20, afterHours: 5, reductionPercent: 75,
      tools: ["Anaplan", "Copilot for Excel"],
      relatedChallenges: ["slow_decision", "data_silo"],
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
  const baseWorkflows = DEPARTMENT_WORKFLOWS[input.department] || DEPARTMENT_WORKFLOWS.sales;
  const multiplier = SIZE_MULTIPLIER[input.companySize] || 1.0;

  // 課題に合致するワークフローを優先、その他も含める
  const scoredWorkflows = baseWorkflows.map((wf) => {
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

  return {
    estimatedHoursSaved: hoursSaved,
    estimatedCostSaved: Math.round((hoursSaved * HOURLY_COST * 12) / 10000), // 万円/年
    automationPotential,
    workflows,
    recommendations,
    departmentLabel: deptItem?.label || "",
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
