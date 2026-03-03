"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendNotification } from "@/lib/notify";
import { useHoneypot } from "@/lib/useHoneypot";

/* ── HTML before the contact section ── */
const htmlMain = `
<nav>
  <div class="logo">PERSONA <span style="font-size:10px;font-weight:500;letter-spacing:1px;color:var(--faint);margin-left:8px">AI導入効果アセスメント</span></div>
  <a href="#contact" class="cta">お問い合わせ</a>
</nav>

<!-- ===== HERO ===== -->
<section class="hero">
  <div class="hero-bg"></div>
  <div class="hero-inner">
    <div class="hero-eyebrow mono">AI導入効果アセスメント</div>
    <div class="hero-big inter">AIで、どの業務が、<br><span class="hl">どれだけ削減できるか</span>。</div>
    <div style="font-size:15px;color:var(--sub);line-height:1.9;max-width:560px;margin-bottom:36px">
      <strong style="color:var(--ink)">業務プロセス分析 × AI × ファーム出身コンサルの伴走</strong>で、導入効果を明らかにする。<br>それがPERSONAのAI導入効果アセスメントです。
    </div>

    <div style="font-size:12px;color:var(--faint);margin-bottom:10px;font-family:'JetBrains Mono';letter-spacing:1px">▼ アセスメントレポートのサンプル（経理部の一例）</div><div class="impact-card">
      <div class="impact-top">
        <div class="impact-before">
          <div class="impact-label mono">BEFORE</div>
          <div class="impact-dept">経理部 — 請求書処理</div>
          <div class="impact-task">紙/PDFを目視で確認、手入力で仕訳</div>
          <div class="impact-desc">月200件の請求書を1件ずつ確認→手入力→転記ミスチェック。ベテラン経理2名の時間が毎月これだけで消える。</div>
          <div class="impact-time inter">月50時間</div>
        </div>
        <div class="impact-arrow">→</div>
        <div class="impact-after">
          <div class="impact-label mono">AFTER</div>
          <div class="impact-dept">AI-OCR + ノーコード自動連携</div>
          <div class="impact-task">AIが読取→仕訳生成→会計ソフト連携</div>
          <div class="impact-desc">sweeepでPDF自動読取→仕訳候補を生成→自動連携でfreeeに登録。担当者は確認ボタンを押すだけ。</div>
          <div class="impact-time inter">月10時間<span class="saved">（-80%）</span></div>
          <div class="impact-tools">推奨: <strong>sweeep</strong> + <strong>自動化ツール</strong> + <strong>freee</strong></div>
        </div>
      </div>
      <div class="impact-bottom">
        <div class="insight">このようなアセスメントを<strong>御社の全部署</strong>に対して実施し、レポートとして納品します</div>
        <a href="#deliverables" class="action">納品物を見る →</a>
      </div>
    </div>

    <div class="hero-sub">
      <div class="desc">診断結果は経営判断の材料となるレポートとして納品。実装に進む場合もPERSONAからコンサルタントをアサインできます。</div>
      <div class="hero-btns">
        <a href="#contact" class="btn-p">無料相談する</a>
        <a href="#pricing" class="btn-s">料金を見る</a>
      </div>
    </div>
  </div>
</section>

<!-- STAT STRIP -->
<div class="stat-strip">
  <div class="stat-strip-inner">
    <div class="stat-item"><div class="sv inter">125<small>万円〜</small></div><div class="sl">診断費用</div></div>
    <div class="stat-item"><div class="sv inter">2<small>週間〜</small></div><div class="sl">最短納期</div></div>
    <div class="stat-item"><div class="sv inter">1,200<small>名+</small></div><div class="sl">登録コンサルタント</div></div>
    <div class="stat-item"><div class="sv inter">3.7<small>x</small></div><div class="sl">初年度ROI（想定）</div></div>
  </div>
</div>

<!-- PAIN -->
<section class="pain-sec">
  <div class="wrap centered">
    <div class="kicker" style="color:rgba(255,255,255,0.25)">CHALLENGES</div>
    <div class="heading">こんな課題はありませんか？</div>
    <div style="height:40px"></div>
  </div>
  <div class="wrap">
    <div class="pain-row">
      <div class="pc"><div class="pn inter">01</div><h3>AIを導入したいが<br>何から始めればいいかわからない</h3><p>社内にAI人材がおらず、どの業務にどのツールが適しているか判断できない</p></div>
      <div class="pc"><div class="pn inter">02</div><h3>PoCはやったが<br>全社展開の道筋が見えない</h3><p>部署ごとにバラバラにツールを試しているが、全体最適ができていない</p></div>
      <div class="pc"><div class="pn inter">03</div><h3>現場が何に時間を使っているか<br>把握できていない</h3><p>業務の実態が見えず、どこに改善余地があるかの判断材料がない</p></div>
    </div>
  </div>
</section>

<!-- WHAT WE DO -->
<section class="what-sec">
  <div class="wrap">
    <div class="what-grid">
      <div class="what-img"><img src="/images/assessment/bg-3.jpg" alt="ヒアリング風景"></div>
      <div class="what-content">
        <div class="kicker">WHAT WE DO</div>
        <div class="heading">診断の進め方</div>
        <div class="subtext" style="margin-bottom:32px">4〜6週間で、御社の業務のAI活用余地を丸ごと可視化します</div>
        <ol class="step-list">
          <li><div class="sn inter">1</div><div><strong>経営層・現場にヒアリング</strong><br>社員一人ひとりに30-45分。「毎日何にどれだけ時間を使っているか」を把握します</div></li>
          <li><div class="sn inter">2</div><div><strong>業務を棚卸して、AI適用可能性を評価</strong><br>定型率・作業時間・繰り返し頻度から、削減ポテンシャルの大きい順にランキング</div></li>
          <li><div class="sn inter">3</div><div><strong>ツール候補と想定削減効果をレポート</strong><br>各業務に対する推奨ツール・自動化フロー案を選定し、Before/After + 想定ROIを試算</div></li>
          <li><div class="sn inter">4</div><div><strong>ロードマップと実装要件を納品</strong><br>「どの順に」「どんな体制で」進めるべきかを含めた診断レポートを経営層にプレゼン</div></li>
        </ol>
      </div>
    </div>
  </div>
</section>

<!-- DELIVERABLES -->
<section id="deliverables" style="background:var(--surface)">
  <div class="wrap">
    <div class="centered">
      <div class="kicker">DELIVERABLES</div>
      <div class="heading">お渡しする資料</div>
      <div class="subtext">「明日から動ける」レベルの具体的な資料一式を納品します</div>
    </div>
    <div class="del-grid">
      <div class="del-card"><div class="del-vis"><div class="dm-m"><div class="mt">業務棚卸シート</div><div class="mr"><div class="mc hd">部署</div><div class="mc hd">業務名</div><div class="mc hd">時間</div><div class="mc hd">定型率</div></div><div class="mr"><div class="mc">営業</div><div class="mc">提案書作成</div><div class="mc">24h</div><div class="mc">70%</div></div><div class="mr"><div class="mc">経理</div><div class="mc">請求書処理</div><div class="mc">50h</div><div class="mc">85%</div></div><div class="mr"><div class="mc">人事</div><div class="mc">書類選考</div><div class="mc">33h</div><div class="mc">75%</div></div></div></div><div class="del-bd"><h4>業務棚卸シート</h4><p>全対象者の業務一覧。所要時間・定型率・使用システムを一覧化</p></div></div>
      <div class="del-card"><div class="del-vis"><div class="dm-m"><div class="mt">業務フロー図（B/A）</div><div style="font-size:7px;color:var(--faint);margin:4px 0 2px">Before:</div><div class="mf"><div class="mn">受領</div><div class="ma">→</div><div class="mn">目視確認</div><div class="ma">→</div><div class="mn">手入力</div><div class="ma">→</div><div class="mn">承認</div></div><div style="font-size:7px;color:var(--faint);margin:6px 0 2px">After:</div><div class="mf"><div class="mn">受領</div><div class="ma">→</div><div class="mn hl">AI読取</div><div class="ma">→</div><div class="mn">確認</div><div class="ma">→</div><div class="mn">承認</div></div></div></div><div class="del-bd"><h4>業務フロー図</h4><p>現状→AI後のフローを図示。どの工程が変わるかを明示</p></div></div>
      <div class="del-card"><div class="del-vis"><div class="dm-m"><div class="mt">施策一覧 + 効果試算</div><div class="mr"><div class="mc hd">施策</div><div class="mc hd">ツール</div><div class="mc hd">削減</div><div class="mc hd">年間</div></div><div class="mr"><div class="mc">請求書OCR</div><div class="mc">sweeep</div><div class="mc">40h</div><div class="mc">240万</div></div><div class="mr"><div class="mc">提案書AI</div><div class="mc">Copilot</div><div class="mc">18h</div><div class="mc">108万</div></div><div class="mr"><div class="mc">FAQ自動化</div><div class="mc">自動化+GPT</div><div class="mc">30h</div><div class="mc">180万</div></div></div></div><div class="del-bd"><h4>施策一覧 + ROI</h4><p>推奨ツール・削減時間・年間コスト効果を一覧化</p></div></div>
      <div class="del-card"><div class="del-vis"><div class="dm-m"><div class="mt">優先順位マトリクス</div><div style="position:relative;height:68px;margin-top:4px"><div style="position:absolute;left:0;top:0;font-size:6px;color:var(--faint)">効果 大 ↑</div><div style="position:absolute;right:0;bottom:0;font-size:6px;color:var(--faint)">難易度 高 →</div><div style="position:absolute;left:20%;top:15%;background:var(--pop);color:#fff;font-size:6px;padding:1px 5px;border-radius:2px">請求書OCR</div><div style="position:absolute;left:10%;top:40%;background:#666;color:#fff;font-size:6px;padding:1px 5px;border-radius:2px">FAQ自動化</div><div style="position:absolute;left:50%;top:25%;background:#999;color:#fff;font-size:6px;padding:1px 5px;border-radius:2px">契約書AI</div><div style="position:absolute;left:0;bottom:0;right:0;height:1px;background:var(--line)"></div><div style="position:absolute;left:0;top:0;bottom:0;width:1px;background:var(--line)"></div></div></div></div><div class="del-bd"><h4>優先順位マトリクス</h4><p>効果×難易度の2軸で全施策をマッピング</p></div></div>
      <div class="del-card"><div class="del-vis"><div class="dm-m"><div class="mt">導入ロードマップ</div><div class="mr"><div class="mc hd" style="flex:0.7">Phase</div><div class="mc hd">施策</div><div class="mc hd">体制</div></div><div class="mr"><div class="mc" style="flex:0.7;font-weight:700">1-3M</div><div class="mc">SaaS AI導入</div><div class="mc">週1-2日</div></div><div class="mr"><div class="mc" style="flex:0.7;font-weight:700">4-6M</div><div class="mc">部署横断展開</div><div class="mc">週2-3日</div></div><div class="mr"><div class="mc" style="flex:0.7;font-weight:700">7-12M</div><div class="mc">基盤構築</div><div class="mc">専任体制</div></div></div></div><div class="del-bd"><h4>導入ロードマップ</h4><p>3/6/12ヶ月の段階的計画。施策・体制・期待効果</p></div></div>
      <div class="del-card"><div class="del-vis"><div class="dm-m"><div class="mt">実装体制・人材要件書</div><div style="font-size:7px;line-height:1.7;margin-top:4px"><div><strong>Phase 1 推奨</strong></div><div>役割: DX/業務改革</div><div>クラス: マネージャー</div><div>稼働: 週2日×3ヶ月</div><div style="margin-top:4px;padding:2px 6px;background:var(--surface);border-radius:2px">→ PERSONAにてご紹介</div></div></div></div><div class="del-bd"><h4>実装体制・人材要件書</h4><p>必要スキル・稼働率を明記。PERSONA人材に直結</p></div></div>
    </div>
  </div>
</section>

<!-- MORE BA EXAMPLES -->
<section>
  <div class="wrap">
    <div class="kicker">MORE EXAMPLES</div>
    <div class="heading">他の部署ではこんな診断結果に</div>
    <div class="subtext">請求書処理だけではありません。営業・全社共通業務にも同じ診断を行い、改善余地をレポートします。</div>
    <div class="ba-more">
      <div class="ba-item"><div class="ba-head"><div class="case mono">CASE 02 — 営業部</div><h3>提案書作成</h3></div><div class="ba-row"><div class="ba-c bf"><div class="bl mono">BEFORE</div>過去の提案書をファイルサーバーから手動検索。PowerPointをほぼゼロから作成し、上長レビュー後に修正を繰り返す。<div class="ba-t">1件あたり8時間</div></div><div class="ba-c af"><div class="bl mono">AFTER</div>AIが過去提案書・事例DBから類似案件を自動抽出しドラフト生成。担当者は顧客固有の部分のみ編集。<div class="ba-t">1件あたり2時間</div><div class="ba-tool">推奨: <strong>Microsoft Copilot</strong> + 社内ナレッジDB</div></div></div></div>
      <div class="ba-item"><div class="ba-head"><div class="case mono">CASE 03 — 全社共通</div><h3>社内問合せ対応</h3></div><div class="ba-row"><div class="ba-c bf"><div class="bl mono">BEFORE</div>総務・IT・経理への問合せがSlack/メールで飛び、同じ質問に何度も回答。担当者の本業が圧迫される。<div class="ba-t">各部署計 月40時間</div></div><div class="ba-c af"><div class="bl mono">AFTER</div>自動化ツールでSlack質問を検知→社内ドキュメント検索→AIが回答生成→自動返信。担当者は例外対応のみ。<div class="ba-t">月10時間</div><div class="ba-tool">推奨: <strong>ノーコード自動化</strong> + <strong>Claude API</strong></div></div></div></div>
    </div>
  </div>
</section>

<!-- CONSULTANT SUPPORT -->
<section style="background:var(--paper);padding:100px 0">
  <div class="wrap">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:center">
      <div>
        <div class="kicker">EXPERT REVIEW</div>
        <div class="heading">ファーム出身のコンサルタントが<br>伴走します</div>
        <div style="font-size:15px;color:var(--sub);line-height:2;margin-bottom:32px;max-width:460px">
          AI導入効果診断は、AIによる分析だけで完結するものではありません。診断プロセスの各フェーズで、MBB・Big4出身のフリーコンサルタントが品質をレビューし、必要に応じて伴走支援に入ります。
        </div>
        <div style="display:flex;flex-direction:column;gap:20px">
          <div style="display:flex;gap:16px;align-items:flex-start">
            <div style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:var(--pop-soft);color:var(--pop);font-family:Inter;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center">1</div>
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:2px">診断設計のレビュー</div>
              <div style="font-size:13px;color:var(--sub);line-height:1.7">ヒアリング項目・対象部署の選定にコンサルタントが入り、診断の精度を担保します</div>
            </div>
          </div>
          <div style="display:flex;gap:16px;align-items:flex-start">
            <div style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:var(--pop-soft);color:var(--pop);font-family:Inter;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center">2</div>
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:2px">分析結果の妥当性チェック</div>
              <div style="font-size:13px;color:var(--sub);line-height:1.7">AIが算出した削減効果・ツール選定をファーム経験者の視点で検証。現場感のある提案に仕上げます</div>
            </div>
          </div>
          <div style="display:flex;gap:16px;align-items:flex-start">
            <div style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:var(--pop-soft);color:var(--pop);font-family:Inter;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center">3</div>
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--ink);margin-bottom:2px">診断後の実行フェーズにも対応</div>
              <div style="font-size:13px;color:var(--sub);line-height:1.7">診断結果をもとに実装に進む場合、PERSONAから最適なコンサルタントを週1日〜の柔軟な稼働でアサイン可能です</div>
            </div>
          </div>
        </div>
      </div>
      <div style="background:var(--surface);border-radius:16px;padding:48px 40px;border:1px solid var(--line)">
        <div style="font-family:'JetBrains Mono';font-size:10px;letter-spacing:2px;color:var(--faint);margin-bottom:20px">CONSULTANT PROFILE</div>
        <div style="display:flex;flex-direction:column;gap:24px">
          <div style="padding-bottom:24px;border-bottom:1px solid var(--line)">
            <div style="font-size:15px;font-weight:700;color:var(--ink);margin-bottom:4px">戦略・業務改革領域</div>
            <div style="font-size:13px;color:var(--sub);line-height:1.7">MBB・Big4出身。DX推進・業務改革プロジェクトの経験を持つマネージャー〜シニアクラス</div>
            <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
              <span style="font-size:10px;background:var(--paper);border:1px solid var(--line);padding:3px 10px;border-radius:100px;color:var(--sub)">McKinsey</span>
              <span style="font-size:10px;background:var(--paper);border:1px solid var(--line);padding:3px 10px;border-radius:100px;color:var(--sub)">BCG</span>
              <span style="font-size:10px;background:var(--paper);border:1px solid var(--line);padding:3px 10px;border-radius:100px;color:var(--sub)">Deloitte</span>
              <span style="font-size:10px;background:var(--paper);border:1px solid var(--line);padding:3px 10px;border-radius:100px;color:var(--sub)">Accenture</span>
            </div>
          </div>
          <div style="padding-bottom:24px;border-bottom:1px solid var(--line)">
            <div style="font-size:15px;font-weight:700;color:var(--ink);margin-bottom:4px">AI・テクノロジー領域</div>
            <div style="font-size:13px;color:var(--sub);line-height:1.7">AI/MLプロジェクト経験を持つテクノロジーコンサルタント。ツール選定・PoC設計に精通</div>
          </div>
          <div>
            <div style="font-size:15px;font-weight:700;color:var(--ink);margin-bottom:4px">稼働の柔軟性</div>
            <div style="font-size:13px;color:var(--sub);line-height:1.7">週1日のスポットレビューから、週3-4日の伴走支援まで。御社のニーズに応じた体制を組めます</div>
            <div style="margin-top:12px;padding:10px 16px;background:var(--pop-soft);border-radius:8px;font-size:12px;color:var(--pop);font-weight:600">登録コンサルタント 1,200名以上 — 診断後の実装フェーズにもシームレスに対応</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- AUTOMATION -->
<section class="n8n-sec">
  <div class="wrap">
    <div class="centered">
      <div class="kicker">REPORT DETAIL</div>
      <div class="heading">レポートにはツール・自動化の<br>具体案まで記載します</div>
      <div class="subtext">「どのツールを使えばいいか」で終わらず、システム間のつなぎ方まで具体的にレポートします。以下は診断レポートに含まれる自動化提案の例です。</div>
    </div>
    <div class="n8n-box">
      <h3>診断レポートに記載される自動化提案の例</h3>
      <p>ヒアリングで判明した定型的なつなぎ作業に対し、ノーコードツールを活用した具体的な自動化フローを提案します。</p>
      <div class="n8n-grid">
        <div class="n8n-i"><h4>請求書自動処理</h4><p>メール受信→PDF抽出→AI読取→仕訳→会計ソフト</p><div class="code">Email → PDF → GPT-4o → freee</div></div>
        <div class="n8n-i"><h4>議事録自動生成</h4><p>会議録画→文字起こし→AI要約→Slack通知</p><div class="code">Webhook → Whisper → Claude → Slack</div></div>
        <div class="n8n-i"><h4>日次レポート自動化</h4><p>データ取得→集計→AIコメント→PDF→配信</p><div class="code">Schedule → DB → GPT → PDF → Email</div></div>
        <div class="n8n-i"><h4>社内FAQ自動応答</h4><p>Slack質問→ドキュメント検索→AI回答→返信</p><div class="code">Slack → VectorDB → Claude → Reply</div></div>
        <div class="n8n-i"><h4>競合モニタリング</h4><p>定期Web巡回→変更検知→AI要約→Slack</p><div class="code">Schedule → HTTP → GPT → Slack</div></div>
        <div class="n8n-i"><h4>リードスコアリング</h4><p>フォーム→企業情報取得→AIスコア→CRM</p><div class="code">Webhook → HTTP → Claude → HubSpot</div></div>
      </div>
    </div>
  </div>
</section>

<!-- PRICING -->
<section id="pricing">
  <div class="wrap">
    <div class="centered">
      <div class="kicker">PRICING</div>
      <div class="heading">料金プラン</div>
      <div class="subtext">コンサルタント単価 250万円/人月。対象規模に応じた3プラン。</div>
    </div>
    <div class="pr-grid">
      <div class="pr-card"><div class="pr-plan mono">LIGHT</div><div class="pr-nm">1部署診断</div><div class="pr-pr inter">125<small>万円</small></div><div class="pr-meta">0.5人月 / 約2週間 / 5-10名</div><ul class="pr-ft"><li>対象1部署の業務棚卸</li><li>Before/After一覧</li><li>推奨ツール + 自動化提案</li><li>削減効果試算</li><li>簡易ロードマップ</li></ul><a href="#contact" class="pr-cta">お問い合わせ</a></div>
      <div class="pr-card ft"><div class="pr-plan mono">STANDARD</div><div class="pr-nm">3-5部署診断</div><div class="pr-pr inter">375<small>万円</small></div><div class="pr-meta">1.5人月 / 約1-1.5ヶ月 / 15-30名</div><ul class="pr-ft"><li>主要部署横断の業務棚卸</li><li>部署別 Before/After + フロー図</li><li>推奨ツール + 自動化提案</li><li>全社削減効果 + ROI</li><li>優先順位マトリクス</li><li>12ヶ月ロードマップ</li><li>経営層向けプレゼン</li><li>実装体制・人材要件書</li></ul><a href="#contact" class="pr-cta">お問い合わせ</a></div>
      <div class="pr-card"><div class="pr-plan mono">PREMIUM</div><div class="pr-nm">全社診断 + PoC</div><div class="pr-pr inter">750<small>万円〜</small></div><div class="pr-meta">3人月〜 / 約2-3ヶ月 / 30-60名</div><ul class="pr-ft"><li>Standardの全納品物</li><li>Quick Win施策1件のPoC</li><li>業務自動化フロー1件構築</li><li>PoC効果測定レポート</li><li>全社展開計画</li><li>PERSONA人材による実装支援</li></ul><a href="#contact" class="pr-cta">お問い合わせ</a></div>
    </div>
    <div class="roi">
      <h3 class="mono">INVESTMENT RETURN — STANDARD</h3>
      <div class="roi-r">
        <div class="ri"><div class="v inter">375万</div><div class="l">アセスメント費用</div></div>
        <div class="dv">→</div>
        <div class="ri"><div class="v inter">1,400万</div><div class="l">年間削減効果</div></div>
        <div class="dv">＝</div>
        <div class="ri"><div class="v inter" style="color:var(--pop)">3.7x</div><div class="l">初年度ROI</div></div>
      </div>
    </div>
  </div>
</section>

<!-- COMPARE -->
<section class="cmp-sec">
  <div class="wrap">
    <div class="centered">
      <div class="kicker">COMPARISON</div>
      <div class="heading">他のアプローチとの比較</div>
      <div style="height:40px"></div>
    </div>
    <table class="cmp">
      <thead><tr><th></th><th>大手コンサルファーム</th><th>AIツールベンダー</th><th>PERSONA</th></tr></thead>
      <tbody>
        <tr><td>価格帯</td><td>数千万円〜</td><td>無料（自社ツール提案目的）</td><td><span class="tg a">125-750万円</span></td></tr>
        <tr><td>中立性</td><td><span class="tg b">高い</span></td><td><span class="tg c">低い</span>（自社製品優先）</td><td><span class="tg a">高い</span> ベンダーニュートラル</td></tr>
        <tr><td>具体性</td><td><span class="tg b">戦略提言中心</span></td><td><span class="tg c">自社ツール範囲</span></td><td><span class="tg a">Before/After</span> + 定量試算</td></tr>
        <tr><td>自動化</td><td>AI導入に限定</td><td>自社AIに限定</td><td><span class="tg a">AI + 自動化</span> 業務フロー全体</td></tr>
        <tr><td>実装支援</td><td>別途大型契約が必要</td><td>自社ツール導入のみ</td><td><span class="tg a">PERSONA人材</span> 週1日〜</td></tr>
        <tr><td>業務理解</td><td><span class="tg b">高い</span></td><td><span class="tg c">低い</span></td><td><span class="tg a">高い</span> ファーム出身者がレビュー</td></tr>
      </tbody>
    </table>
  </div>
</section>

<!-- FAQ -->
<section>
  <div class="wrap">
    <div class="centered">
      <div class="kicker">FAQ</div>
      <div class="heading">よくある質問</div>
      <div style="height:40px"></div>
    </div>
    <div class="faq">
      <div class="faq-item open"><div class="faq-q">アセスメントにはどれくらいの期間がかかりますか？</div><div class="faq-a">Lightプラン（1部署）で約2週間、Standardプラン（3-5部署）で約1〜1.5ヶ月が目安です。</div></div>
      <div class="faq-item"><div class="faq-q">社員のヒアリングにはどの程度の負荷がかかりますか？</div><div class="faq-a">1人あたり30〜45分の個別ヒアリングを1回実施します。日常業務への影響は最小限に調整します。</div></div>
      <div class="faq-item"><div class="faq-q">アセスメント後、実装支援も依頼できますか？</div><div class="faq-a">はい。レポートに「必要な人材像」を明記しており、PERSONAから最適な人材をご紹介します。</div></div>
      <div class="faq-item"><div class="faq-q">特定のAIツールを推奨されることはありますか？</div><div class="faq-a">ベンダーニュートラルの立場で診断します。御社の環境・予算に最適なツールを客観的に提案します。</div></div>
      <div class="faq-item"><div class="faq-q">まずは1部署だけ試すことはできますか？</div><div class="faq-a">Lightプラン（125万円）でスモールスタート可能です。</div></div>
    </div>
  </div>
</section>
`;

/* ── Footer HTML ── */
const htmlFooter = `
<footer>
  <div class="fl">PERSONA</div>
  <p>Activated Trigger株式会社 | プロフェッショナルクラウド「PERSONA」</p>
  <p style="margin-top:6px">&copy; 2026 Activated Trigger Inc.</p>
</footer>
`;

/* ── Contact Form ── */
function AssessmentContactForm() {
  const [formData, setFormData] = useState({
    companyName: "",
    fullName: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hp = useHoneypot();

  function update(key: string, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (hp.isFilled) { setSubmitted(true); return; }
    if (!formData.companyName || !formData.fullName || !formData.email) {
      setError("必須項目をすべて入力してください");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase
        .from("inquiries")
        .insert({
          type: "assessment_inquiry",
          company_name: formData.companyName,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone || null,
          message: formData.message || null,
        });
      if (insertError) throw insertError;
      sendNotification("enterprise_inquiry", {
        company_name: `【AIアセスメント】${formData.companyName}`,
        full_name: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
      });
      setSubmitted(true);
    } catch {
      setError("送信に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cf-card">
      {submitted ? (
        <div className="cf-success">
          <div className="cf-check">&#10003;</div>
          <h3>お問い合わせありがとうございます</h3>
          <p>内容を確認の上、担当者より1営業日以内にご連絡いたします。</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="cf-grid">
            <div>
              <label className="cf-label">会社名<span className="cf-req">*</span></label>
              <input
                className="cf-input"
                type="text"
                required
                placeholder="株式会社〇〇"
                value={formData.companyName}
                onChange={(e) => update("companyName", e.target.value)}
              />
            </div>
            <div>
              <label className="cf-label">ご担当者名<span className="cf-req">*</span></label>
              <input
                className="cf-input"
                type="text"
                required
                placeholder="山田 太郎"
                value={formData.fullName}
                onChange={(e) => update("fullName", e.target.value)}
              />
            </div>
            <div>
              <label className="cf-label">メールアドレス<span className="cf-req">*</span></label>
              <input
                className="cf-input"
                type="email"
                required
                placeholder="example@company.com"
                value={formData.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
            <div>
              <label className="cf-label">電話番号</label>
              <input
                className="cf-input"
                type="tel"
                placeholder="03-0000-0000"
                value={formData.phone}
                onChange={(e) => update("phone", e.target.value)}
              />
            </div>
            <div className="cf-full">
              <label className="cf-label">ご相談内容</label>
              <textarea
                className="cf-input cf-textarea"
                rows={4}
                placeholder="ご検討中の内容やご質問をお聞かせください"
                value={formData.message}
                onChange={(e) => update("message", e.target.value)}
              />
            </div>
          </div>
          {/* Honeypot */}
          <input
            type="text"
            name="website"
            value={hp.value}
            onChange={(e) => hp.setValue(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            style={{ position: "absolute", opacity: 0, height: 0, width: 0, pointerEvents: "none" }}
            aria-hidden="true"
          />
          {error && <div className="cf-error">{error}</div>}
          <button type="submit" className="cf-submit" disabled={loading}>
            {loading ? "送信中..." : "無料相談を申し込む"}
          </button>
          <p className="cf-note">1営業日以内に担当者よりご連絡いたします</p>
        </form>
      )}
    </div>
  );
}

/* ── Main Component ── */
export default function AssessmentLP() {
  useEffect(() => {
    const handleFaqClick = (e: Event) => {
      const target = e.currentTarget as HTMLElement;
      target.parentElement?.classList.toggle("open");
    };
    const faqItems = document.querySelectorAll(".assessment-lp .faq-q");
    faqItems.forEach((q) => q.addEventListener("click", handleFaqClick));
    return () => {
      faqItems.forEach((q) => q.removeEventListener("click", handleFaqClick));
    };
  }, []);

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800;900&family=JetBrains+Mono:wght@500&family=Noto+Sans+JP:wght@400;500;700;900&display=swap"
      />
      <div className="assessment-lp">
        <div dangerouslySetInnerHTML={{ __html: htmlMain }} />
        {/* Contact / CTA section with embedded form */}
        <section className="cta-sec" id="contact">
          <h2>AI導入効果アセスメント、<br />まずはご相談ください</h2>
          <p>御社の状況をお伺いし、最適なプランをご提案します。</p>
          <AssessmentContactForm />
        </section>
        <div dangerouslySetInnerHTML={{ __html: htmlFooter }} />
      </div>
    </>
  );
}
