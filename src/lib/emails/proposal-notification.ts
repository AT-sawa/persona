import { BASE_URL, APP_URL } from "@/lib/constants";

/**
 * Generate proposal notification email HTML.
 * Sent to the client when a new proposal is shared with them.
 */
export function buildProposalNotificationEmail(opts: {
  companyName: string;
  proposalTitle: string;
  proposalId: string;
  talentCount: number;
  message?: string | null;
}): {
  subject: string;
  html: string;
} {
  const { companyName, proposalTitle, proposalId, talentCount, message } = opts;
  const proposalUrl = `${APP_URL}/dashboard/portal/${proposalId}`;

  const subject = `【PERSONA】新しい人材提案が届きました｜${proposalTitle}`;

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
              <p style="margin:0 0 8px;font-size:11px;font-weight:bold;color:#1FABE9;letter-spacing:0.15em;text-transform:uppercase;">
                NEW PROPOSAL
              </p>
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#091747;line-height:1.4;">
                ${companyName}様、<br/>新しい人材提案が届きました。
              </h1>
              <p style="margin:0;font-size:14px;color:#666;line-height:1.8;">
                PERSONAより人材のご提案をお送りいたします。ポータルにログインして提案内容をご確認ください。
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #e8e8ed;"></div>
            </td>
          </tr>

          <!-- Proposal Summary -->
          <tr>
            <td style="padding:28px 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fb;border-radius:12px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#999;">提案タイトル</p>
                    <p style="margin:0 0 16px;font-size:17px;font-weight:bold;color:#091747;">${proposalTitle}</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="padding:8px 0;border-top:1px solid #e8e8ed;">
                          <p style="margin:0;font-size:12px;color:#999;">候補人材数</p>
                          <p style="margin:4px 0 0;font-size:20px;font-weight:900;color:#1FABE9;">${talentCount}名</p>
                        </td>
                        <td width="50%" style="padding:8px 0;border-top:1px solid #e8e8ed;">
                          <p style="margin:0;font-size:12px;color:#999;">ステータス</p>
                          <p style="margin:4px 0 0;font-size:14px;font-weight:bold;color:#10b981;">ご確認待ち</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${message ? `
          <!-- Message from coordinator -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border-radius:12px;border:1px solid #fef3c7;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:bold;color:#92400e;">担当コーディネーターより</p>
                    <p style="margin:0;font-size:14px;color:#78350f;line-height:1.8;">${message}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ` : ""}

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#091747;border-radius:12px;">
                <tr>
                  <td style="padding:28px 32px;text-align:center;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:bold;color:#1FABE9;letter-spacing:0.15em;text-transform:uppercase;">
                      VIEW PROPOSAL
                    </p>
                    <p style="margin:0 0 16px;font-size:16px;font-weight:bold;color:#ffffff;">
                      提案内容を確認する
                    </p>
                    <a href="${proposalUrl}" style="display:inline-block;background:linear-gradient(90deg,#1FABE9,#34d399);color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;padding:12px 32px;border-radius:24px;">
                      提案を見る &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Next steps -->
          <tr>
            <td style="padding:0 40px 24px;">
              <p style="margin:0 0 12px;font-size:14px;font-weight:bold;color:#091747;">ご確認後のステップ</p>
              <p style="margin:0;font-size:13px;color:#666;line-height:1.8;">
                各候補者に対して「興味あり」または「見送り」のリアクションと、コメントをお送りいただけます。ご質問やご要望がございましたら、メッセージ機能よりお気軽にご連絡ください。
              </p>
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
                このメールはPERSONAの提案ポータルをご利用のクライアント様にお送りしています。
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
