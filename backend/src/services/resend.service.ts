import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "ZeroOne <noreply@zeroonec.xyz>";

/**
 * Send login notification email
 */
export async function sendLoginNotification(
  to: string,
  userName: string,
  loginInfo: {
    ip?: string;
    userAgent?: string;
    timestamp: Date;
  }
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log("[resend] Skipping login email - RESEND_API_KEY not set");
    return;
  }

  const formattedTime = loginInfo.timestamp.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: "New sign-in to ZeroOne",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Sign-in to ZeroOne</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 40px 30px; }
    .greeting { font-size: 18px; margin-bottom: 20px; }
    .info-box { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; margin: 10px 0; }
    .info-label { font-weight: 600; width: 100px; color: #64748b; }
    .info-value { color: #1e293b; }
    .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .alert-box p { margin: 0; color: #92400e; font-size: 14px; }
    .footer { padding: 30px; text-align: center; background: #f8fafc; border-top: 1px solid #e2e8f0; }
    .footer p { margin: 0; color: #64748b; font-size: 14px; }
    .button { display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin-top: 20px; font-weight: 500; }
    .button:hover { background: #5558e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 New Sign-in Detected</h1>
    </div>
    <div class="content">
      <p class="greeting">Hi ${userName},</p>
      <p>We noticed a new sign-in to your ZeroOne account. Here are the details:</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="info-label">Time:</span>
          <span class="info-value">${formattedTime}</span>
        </div>
        ${loginInfo.ip ? `
        <div class="info-row">
          <span class="info-label">IP:</span>
          <span class="info-value">${loginInfo.ip}</span>
        </div>
        ` : ""}
      </div>

      <div class="alert-box">
        <p>🔒 If this was you, you can safely ignore this email. If you don't recognize this activity, please secure your account immediately.</p>
      </div>

      <center>
        <a href="${process.env.FRONTEND_URL ?? "https://zeroonec.xyz"}/dashboard/settings" class="button">Review Account Activity</a>
      </center>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ZeroOne. All rights reserved.</p>
      <p style="margin-top: 10px; font-size: 12px;">ZeroOne — Deploy AI Agents in One Click</p>
    </div>
  </div>
</body>
</html>
      `,
    });

    console.log(`[resend] Login notification sent to ${to}`);
  } catch (err) {
    console.error("[resend] Failed to send login notification:", err);
  }
}

/**
 * Send agent created notification email
 */
export async function sendAgentCreatedEmail(
  to: string,
  userName: string,
  agentInfo: {
    name: string;
    slug: string;
    provider: string;
    model: string;
    subdomain: string;
  }
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log("[resend] Skipping agent created email - RESEND_API_KEY not set");
    return;
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `🎉 Agent "${agentInfo.name}" is ready!`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Agent is Ready!</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
    .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 30px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 600; }
    .header p { color: rgba(255,255,255,0.9); margin: 10px 0 0; }
    .content { padding: 40px 30px; }
    .greeting { font-size: 18px; margin-bottom: 20px; }
    .agent-card { background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); border-radius: 12px; padding: 24px; margin: 24px 0; border: 1px solid #cbd5e1; }
    .agent-name { font-size: 24px; font-weight: 700; color: #1e293b; margin: 0 0 8px; }
    .agent-url { font-size: 14px; color: #6366f1; font-family: monospace; background: white; padding: 8px 12px; border-radius: 6px; display: inline-block; margin: 8px 0; }
    .stats { display: flex; gap: 20px; margin-top: 16px; }
    .stat { flex: 1; text-align: center; }
    .stat-value { font-size: 14px; font-weight: 600; color: #1e293b; }
    .stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
    .feature-list { margin: 24px 0; }
    .feature-item { display: flex; align-items: center; margin: 12px 0; }
    .feature-icon { width: 24px; height: 24px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; color: #16a34a; font-size: 12px; }
    .footer { padding: 30px; text-align: center; background: #f8fafc; border-top: 1px solid #e2e8f0; }
    .footer p { margin: 0; color: #64748b; font-size: 14px; }
    .button { display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; margin: 8px; font-weight: 600; }
    .button:hover { background: #5558e0; }
    .button-secondary { display: inline-block; background: white; color: #6366f1; text-decoration: none; padding: 14px 28px; border-radius: 8px; margin: 8px; font-weight: 600; border: 2px solid #6366f1; }
    .button-secondary:hover { background: #f8fafc; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Congratulations!</h1>
      <p>Your AI agent is now live and ready to work</p>
    </div>
    <div class="content">
      <p class="greeting">Hi ${userName},</p>
      <p>Great news! Your AI agent has been successfully deployed and is now running. Here's everything you need to know:</p>
      
      <div class="agent-card">
        <h2 class="agent-name">${agentInfo.name}</h2>
        <div class="agent-url">https://${agentInfo.subdomain}</div>
        
        <div class="stats">
          <div class="stat">
            <div class="stat-value">${agentInfo.provider}</div>
            <div class="stat-label">Provider</div>
          </div>
          <div class="stat">
            <div class="stat-value">${agentInfo.model.split("/").pop()}</div>
            <div class="stat-label">Model</div>
          </div>
          <div class="stat">
            <div class="stat-value">~5MB</div>
            <div class="stat-label">RAM Usage</div>
          </div>
        </div>
      </div>

      <div class="feature-list">
        <div class="feature-item">
          <div class="feature-icon">✓</div>
          <span>Access your agent via the unique subdomain above</span>
        </div>
        <div class="feature-item">
          <div class="feature-icon">✓</div>
          <span>Connect to Telegram, Discord, or Slack channels</span>
        </div>
        <div class="feature-item">
          <div class="feature-icon">✓</div>
          <span>Monitor performance and logs in real-time</span>
        </div>
        <div class="feature-item">
          <div class="feature-icon">✓</div>
          <span>Customize personality and memory settings</span>
        </div>
      </div>

      <center>
        <a href="${process.env.FRONTEND_URL ?? "https://zeroonec.xyz"}/dashboard/agents" class="button">Manage Your Agent</a>
        <a href="https://${agentInfo.subdomain}" class="button-secondary">Open Agent</a>
      </center>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ZeroOne. All rights reserved.</p>
      <p style="margin-top: 10px; font-size: 12px;">ZeroOne — Deploy AI Agents in One Click</p>
    </div>
  </div>
</body>
</html>
      `,
    });

    console.log(`[resend] Agent created email sent to ${to}`);
  } catch (err) {
    console.error("[resend] Failed to send agent created email:", err);
  }
}
