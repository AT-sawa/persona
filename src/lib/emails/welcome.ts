import { BASE_URL, APP_URL } from "@/lib/constants";

/**
 * Generate welcome email HTML for new user registration.
 */
export function buildWelcomeEmail(fullName: string): {
  subject: string;
  html: string;
} {
  const dashboardUrl = `${APP_URL}/dashboard`;
  const profileUrl = `${APP_URL}/dashboard/profile`;
  const resumeUrl = `${APP_URL}/dashboard/resumes`;
  const preferencesUrl = `${APP_URL}/dashboard/preferences`;
  const casesUrl = `${BASE_URL}/cases`;

  const subject = `PERSONA へようこそ｜${fullName}さんの登録が完了しました`;

  const html = `
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f6f8;font-family:'Helvetica Neue',Arial,'Hiragino Kaku Gothic ProN','Hiragino Sans',Meiryo,sans-serif;-webkit-font-smoothing:antialiased;">

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f6f8;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Main Card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="background-color:#091747;padding:32px 40px;text-align:center;">
              <img src="${BASE_URL}/images/persona_logo_white.png" alt="PERSONA" width="140" style="display:inline-block;height:auto;" />
            </td>
          </tr>

          <!-- Hero -->
          <tr>
            <td style="padding:40px 40px 24px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#091747;line-height:1.4;">
                ${fullName}さん、<br/>ようこそ PERSONA へ。
              </h1>
              <p style="margin:0;font-size:14px;color:#666;line-height:1.8;">
                ご登録ありがとうございます。PERSONAは、コンサルティングファーム出身者のためのフリーコンサル案件紹介サービスです。
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #e8e8ed;"></div>
            </td>
          </tr>

          <!-- Steps Section -->
          <tr>
            <td style="padding:28px 40px 8px;">
              <p style="margin:0 0 20px;font-size:11px;font-weight:bold;color:#1FABE9;letter-spacing:0.15em;text-transform:uppercase;">
                NEXT STEPS
              </p>
              <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.8;">
                プロフィールを充実させると、AIマッチングの精度が大幅に向上します。以下の3ステップを完了させてください。
              </p>
            </td>
          </tr>

          <!-- Step 1: Resume -->
          <tr>
            <td style="padding:0 40px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fb;border-radius:12px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48" valign="top">
                          <div style="width:40px;height:40px;background-color:#1FABE9;border-radius:10px;text-align:center;line-height:40px;color:#fff;font-size:18px;font-weight:900;">1</div>
                        </td>
                        <td style="padding-left:16px;">
                          <p style="margin:0 0 4px;font-size:15px;font-weight:bold;color:#091747;">レジュメをアップロード</p>
                          <p style="margin:0 0 12px;font-size:13px;color:#888;line-height:1.6;">
                            職務経歴書（PDF）をアップロードすると、スキルと経歴をAIが自動で読み取り、マッチング精度が大幅に向上します。
                          </p>
                          <a href="${resumeUrl}" style="display:inline-block;background-color:#1FABE9;color:#ffffff;font-size:13px;font-weight:bold;text-decoration:none;padding:8px 20px;border-radius:6px;">
                            レジュメをアップロード &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Step 2: Profile -->
          <tr>
            <td style="padding:0 40px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fb;border-radius:12px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48" valign="top">
                          <div style="width:40px;height:40px;background-color:#091747;border-radius:10px;text-align:center;line-height:40px;color:#fff;font-size:18px;font-weight:900;">2</div>
                        </td>
                        <td style="padding-left:16px;">
                          <p style="margin:0 0 4px;font-size:15px;font-weight:bold;color:#091747;">プロフィールを完成させる</p>
                          <p style="margin:0 0 12px;font-size:13px;color:#888;line-height:1.6;">
                            経歴概要・スキル・稼働可能日を入力して、あなたに合った案件を見つけやすくしましょう。
                          </p>
                          <a href="${profileUrl}" style="display:inline-block;background-color:#091747;color:#ffffff;font-size:13px;font-weight:bold;text-decoration:none;padding:8px 20px;border-radius:6px;">
                            プロフィールを編集 &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Step 3: Preferences -->
          <tr>
            <td style="padding:0 40px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fb;border-radius:12px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48" valign="top">
                          <div style="width:40px;height:40px;background-color:#10b981;border-radius:10px;text-align:center;line-height:40px;color:#fff;font-size:18px;font-weight:900;">3</div>
                        </td>
                        <td style="padding-left:16px;">
                          <p style="margin:0 0 4px;font-size:15px;font-weight:bold;color:#091747;">希望条件を設定</p>
                          <p style="margin:0 0 12px;font-size:13px;color:#888;line-height:1.6;">
                            希望単価・業界・稼働率・リモートの希望を設定すると、条件に合った案件を自動でご紹介します。
                          </p>
                          <a href="${preferencesUrl}" style="display:inline-block;background-color:#10b981;color:#ffffff;font-size:13px;font-weight:bold;text-decoration:none;padding:8px 20px;border-radius:6px;">
                            希望条件を設定 &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA: Browse Cases -->
          <tr>
            <td style="padding:24px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#091747;border-radius:12px;">
                <tr>
                  <td style="padding:28px 32px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:bold;color:#1FABE9;letter-spacing:0.15em;text-transform:uppercase;">
                      BROWSE CASES
                    </p>
                    <p style="margin:0 0 16px;font-size:16px;font-weight:bold;color:#ffffff;">
                      案件を探してみましょう
                    </p>
                    <a href="${casesUrl}" style="display:inline-block;background:linear-gradient(90deg,#1FABE9,#34d399);color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 32px;border-radius:24px;">
                      案件一覧を見る &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Stats -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" style="text-align:center;padding:16px 0;border:1px solid #e8e8ed;border-right:none;border-radius:8px 0 0 8px;">
                    <div style="font-size:24px;font-weight:900;color:#1FABE9;">100+</div>
                    <div style="font-size:11px;color:#999;margin-top:2px;">常時案件数</div>
                  </td>
                  <td width="34%" style="text-align:center;padding:16px 0;border:1px solid #e8e8ed;">
                    <div style="font-size:24px;font-weight:900;color:#1FABE9;">30+</div>
                    <div style="font-size:11px;color:#999;margin-top:2px;">提携エージェント</div>
                  </td>
                  <td width="33%" style="text-align:center;padding:16px 0;border:1px solid #e8e8ed;border-left:none;border-radius:0 8px 8px 0;">
                    <div style="font-size:24px;font-weight:900;color:#1FABE9;">250万</div>
                    <div style="font-size:11px;color:#999;margin-top:2px;">最高月額</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fb;padding:24px 40px;border-top:1px solid #e8e8ed;">
              <p style="margin:0 0 8px;font-size:12px;color:#888;line-height:1.6;">
                ご不明な点がございましたら、お気軽にお問い合わせください。
              </p>
              <p style="margin:0;font-size:11px;color:#bbb;">
                PERSONA（ペルソナ）<br/>
                <a href="${BASE_URL}" style="color:#1FABE9;text-decoration:none;">${BASE_URL.replace("https://", "")}</a>
              </p>
            </td>
          </tr>

        </table>
        <!-- /Main Card -->

        <!-- Unsubscribe footer -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:16px 0;text-align:center;">
              <p style="margin:0;font-size:10px;color:#ccc;">
                このメールはPERSONAにご登録いただいた方にお送りしています。
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>`.trim();

  return { subject, html };
}
