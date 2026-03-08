import { BASE_URL, APP_URL } from "@/lib/constants";

/**
 * Generate client invitation email HTML.
 * Sent when an admin creates a client account.
 */
export function buildClientInvitationEmail(opts: {
  companyName: string;
  email: string;
  temporaryPassword: string;
}): {
  subject: string;
  html: string;
} {
  const { companyName, email, temporaryPassword } = opts;
  const loginUrl = `${APP_URL}/auth/login`;
  const portalUrl = `${APP_URL}/dashboard/portal`;

  const subject = `【PERSONA】人材提案ポータルへのご招待｜${companyName}様`;

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
                ${companyName}様、<br/>人材提案ポータルへようこそ。
              </h1>
              <p style="margin:0;font-size:14px;color:#666;line-height:1.8;">
                PERSONAの人材提案ポータルへのアカウントが作成されました。以下の情報でログインし、ご提案内容をご確認ください。
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #e8e8ed;"></div>
            </td>
          </tr>

          <!-- Login Info -->
          <tr>
            <td style="padding:28px 40px 8px;">
              <p style="margin:0 0 20px;font-size:11px;font-weight:bold;color:#1FABE9;letter-spacing:0.15em;text-transform:uppercase;">
                LOGIN INFORMATION
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fb;border-radius:12px;">
                <tr>
                  <td style="padding:24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom:12px;">
                          <p style="margin:0;font-size:12px;color:#999;">メールアドレス</p>
                          <p style="margin:4px 0 0;font-size:15px;font-weight:bold;color:#091747;">${email}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom:12px;">
                          <p style="margin:0;font-size:12px;color:#999;">初回パスワード</p>
                          <p style="margin:4px 0 0;font-size:15px;font-weight:bold;color:#091747;font-family:monospace;letter-spacing:1px;">${temporaryPassword}</p>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:12px 0 0;font-size:12px;color:#c0392b;line-height:1.6;">
                      ※ 初回ログイン後、パスワードの変更をお願いいたします。
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#091747;border-radius:12px;">
                <tr>
                  <td style="padding:28px 32px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:bold;color:#1FABE9;letter-spacing:0.15em;text-transform:uppercase;">
                      PROPOSAL PORTAL
                    </p>
                    <p style="margin:0 0 16px;font-size:16px;font-weight:bold;color:#ffffff;">
                      提案ポータルにログイン
                    </p>
                    <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(90deg,#1FABE9,#34d399);color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 32px;border-radius:24px;">
                      ログインする &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- How it works -->
          <tr>
            <td style="padding:0 40px 8px;">
              <p style="margin:0 0 16px;font-size:11px;font-weight:bold;color:#1FABE9;letter-spacing:0.15em;text-transform:uppercase;">
                HOW IT WORKS
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #f0f0f5;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="32" valign="top">
                          <div style="width:24px;height:24px;background-color:#1FABE9;border-radius:12px;text-align:center;line-height:24px;color:#fff;font-size:12px;font-weight:900;">1</div>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0;font-size:14px;color:#091747;font-weight:bold;">ログイン</p>
                          <p style="margin:2px 0 0;font-size:13px;color:#888;">上記の情報でポータルにログインします</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;border-bottom:1px solid #f0f0f5;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="32" valign="top">
                          <div style="width:24px;height:24px;background-color:#091747;border-radius:12px;text-align:center;line-height:24px;color:#fff;font-size:12px;font-weight:900;">2</div>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0;font-size:14px;color:#091747;font-weight:bold;">提案内容を確認</p>
                          <p style="margin:2px 0 0;font-size:13px;color:#888;">候補人材のスキル・経験・提案金額を確認します</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="32" valign="top">
                          <div style="width:24px;height:24px;background-color:#10b981;border-radius:12px;text-align:center;line-height:24px;color:#fff;font-size:12px;font-weight:900;">3</div>
                        </td>
                        <td style="padding-left:12px;">
                          <p style="margin:0;font-size:14px;color:#091747;font-weight:bold;">リアクション</p>
                          <p style="margin:2px 0 0;font-size:13px;color:#888;">各候補者に「興味あり」「見送り」のフィードバックを送信できます</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fb;padding:24px 40px;border-top:1px solid #e8e8ed;">
              <p style="margin:0 0 8px;font-size:12px;color:#888;line-height:1.6;">
                ご不明な点がございましたら、担当コーディネーターまでお気軽にご連絡ください。
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
                このメールはPERSONAの提案ポータルにご招待された方にお送りしています。
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
