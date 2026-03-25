// server/services/emailService.js
const nodemailer = require('nodemailer');

// ── Create transporter ──────────────────────
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Dev mode — log to console if no SMTP configured
  if (!host || !user || !pass) {
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
  }

  return nodemailer.createTransport({
    host,
    port:   parseInt(process.env.SMTP_PORT) || 587,
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth:   { user, pass },
    tls:    { rejectUnauthorized: false },
  });
}

const FROM = process.env.EMAIL_FROM || 'BrainDeck <noreply@braindeck.app>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// ── Shared HTML shell ───────────────────────
function emailShell({ preheader, body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>BrainDeck</title>
<style>
  body{margin:0;padding:0;background:#e8edf5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
  .shell{max-width:560px;margin:40px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:8px 8px 24px #c5cad6,-4px -4px 12px #fff}
  .header{background:linear-gradient(135deg,#6c63ff 0%,#38bdf8 100%);padding:36px 40px 32px;text-align:center}
  .logo{color:#fff;font-size:22px;font-weight:800;letter-spacing:-.5px}
  .logo span{opacity:.8;font-weight:400}
  .body{padding:36px 40px}
  h2{margin:0 0 12px;color:#2d3561;font-size:20px;font-weight:800}
  p{margin:0 0 16px;color:#5a6280;font-size:15px;line-height:1.7}
  .btn{display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#6c63ff,#38bdf8);color:#fff!important;font-weight:700;font-size:15px;border-radius:12px;text-decoration:none;margin:8px 0 20px}
  .note{font-size:13px;color:#a8afc9;margin-top:4px}
  .divider{border:none;border-top:1px solid #eef0f8;margin:24px 0}
  .footer{padding:24px 40px;background:#f5f7fc;text-align:center}
  .footer p{font-size:12px;color:#a8afc9;margin:0}
  .badge{display:inline-block;background:rgba(108,99,255,.1);color:#6c63ff;font-size:12px;font-weight:600;padding:4px 12px;border-radius:20px;margin-bottom:20px}
  .stat{display:inline-block;background:#f5f7fc;border-radius:12px;padding:12px 20px;margin:6px;text-align:center;min-width:80px}
  .stat-num{font-size:22px;font-weight:800;color:#6c63ff;display:block}
  .stat-lbl{font-size:12px;color:#a8afc9}
  @media(max-width:600px){.shell{margin:0;border-radius:0}.body,.footer{padding:24px 20px}.header{padding:28px 20px}}
</style>
</head>
<body>
<div style="display:none;max-height:0;overflow:hidden">${preheader}</div>
<div class="shell">
  <div class="header">
    <div class="logo">🧠 Brain<span>Deck</span></div>
  </div>
  <div class="body">${body}</div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} BrainDeck · AI-powered study cards<br>
    You're receiving this because you signed up at <a href="${APP_URL}" style="color:#6c63ff">${APP_URL}</a></p>
  </div>
</div>
</body>
</html>`;
}

// ── Send helper ─────────────────────────────
async function send({ to, subject, html, text }) {
  const transporter = createTransporter();
  const isDev = !process.env.SMTP_USER;

  const info = await transporter.sendMail({
    from: FROM,
    to,
    subject,
    html,
    text: text || subject,
  });

  if (isDev) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`[Email] To:      ${to}`);
    console.log(`[Email] Subject: ${subject}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
  return info;
}

// ══ EMAIL TEMPLATES ══════════════════════════

// 1. Email verification
async function sendVerificationEmail(user, token) {
  const url = `${APP_URL}/verify-email.html?token=${token}`;
  const html = emailShell({
    preheader: 'Confirm your email to start using BrainDeck',
    body: `
      <div class="badge">Email verification</div>
      <h2>Confirm your email address</h2>
      <p>Hi ${user.name || 'there'}! Welcome to BrainDeck. Click the button below to verify your email address and unlock all features.</p>
      <div style="text-align:center">
        <a href="${url}" class="btn">Verify my email</a>
        <p class="note">This link expires in <strong>24 hours</strong>.</p>
      </div>
      <hr class="divider"/>
      <p class="note">If you didn't create a BrainDeck account, you can safely ignore this email.</p>
      <p class="note">Or copy this link: <a href="${url}" style="color:#6c63ff;word-break:break-all">${url}</a></p>
    `,
  });

  if (!process.env.SMTP_USER) {
    console.log(`[Email] VERIFY URL: ${url}`);
  }

  return send({ to: user.email, subject: 'Verify your BrainDeck email', html });
}

// 2. Welcome email (sent after verification)
async function sendWelcomeEmail(user) {
  const html = emailShell({
    preheader: 'Your BrainDeck account is ready — start studying smarter',
    body: `
      <div class="badge">Welcome aboard</div>
      <h2>You're all set, ${user.name || 'there'}! 🎉</h2>
      <p>Your BrainDeck account is verified and ready. Here's what you can do right now:</p>
      <p>
        <strong style="color:#2d3561">📄 Upload any document</strong><br>
        PDF, Word, PowerPoint, or plain text — up to 20MB.
      </p>
      <p>
        <strong style="color:#2d3561">🧠 AI generates your cards</strong><br>
        Flashcards, summaries, or quiz questions — all powered by AI.
      </p>
      <p>
        <strong style="color:#2d3561">📊 Track your progress</strong><br>
        Spaced repetition, streaks, XP, and a study heatmap on your dashboard.
      </p>
      <div style="text-align:center">
        <a href="${APP_URL}" class="btn">Start studying →</a>
      </div>
      <hr class="divider"/>
      <p class="note">Pro tip: Press <strong>?</strong> anywhere in BrainDeck to see all keyboard shortcuts.</p>
    `,
  });

  return send({ to: user.email, subject: `Welcome to BrainDeck, ${user.name || 'there'}!`, html });
}

// 3. Password reset email
async function sendPasswordResetEmail(user, token) {
  const url = `${APP_URL}/forgot-password.html?reset=${token}`;
  const html = emailShell({
    preheader: 'Reset your BrainDeck password',
    body: `
      <div class="badge">Password reset</div>
      <h2>Reset your password</h2>
      <p>Hi ${user.name || 'there'}, we received a request to reset the password for your BrainDeck account.</p>
      <div style="text-align:center">
        <a href="${url}" class="btn">Reset my password</a>
        <p class="note">This link expires in <strong>1 hour</strong>.</p>
      </div>
      <hr class="divider"/>
      <p class="note">If you didn't request a password reset, you can safely ignore this email. Your password won't change.</p>
      <p class="note">Or copy this link: <a href="${url}" style="color:#6c63ff;word-break:break-all">${url}</a></p>
    `,
  });

  if (!process.env.SMTP_USER) {
    console.log(`[Email] RESET URL: ${url}`);
  }

  return send({ to: user.email, subject: 'Reset your BrainDeck password', html });
}

// 4. Login notification (optional — for new device logins)
async function sendLoginNotificationEmail(user, { ip, userAgent, time }) {
  const html = emailShell({
    preheader: 'New sign-in to your BrainDeck account',
    body: `
      <div class="badge">Security notice</div>
      <h2>New sign-in detected</h2>
      <p>Hi ${user.name || 'there'}, we noticed a new sign-in to your BrainDeck account.</p>
      <div style="background:#f5f7fc;border-radius:12px;padding:16px 20px;margin:16px 0">
        <p style="margin:4px 0;font-size:14px"><strong>Time:</strong> ${time}</p>
        <p style="margin:4px 0;font-size:14px"><strong>IP:</strong> ${ip || 'Unknown'}</p>
        <p style="margin:4px 0;font-size:14px"><strong>Device:</strong> ${(userAgent||'Unknown').slice(0,80)}</p>
      </div>
      <p>If this was you, no action is needed. If you didn't sign in, change your password immediately.</p>
      <div style="text-align:center">
        <a href="${APP_URL}/forgot-password.html" class="btn">Change my password</a>
      </div>
    `,
  });

  return send({ to: user.email, subject: 'New sign-in to your BrainDeck account', html });
}

// 5. Weekly study digest
async function sendWeeklyDigest(user, { decksCount, streakDays, xp, dueCards }) {
  const html = emailShell({
    preheader: `Your BrainDeck week in review — ${streakDays} day streak!`,
    body: `
      <div class="badge">Weekly digest</div>
      <h2>Your week in review 📊</h2>
      <p>Hi ${user.name || 'there'}, here's how your studying went this week:</p>
      <div style="text-align:center;margin:20px 0">
        <div class="stat"><span class="stat-num">${streakDays}</span><span class="stat-lbl">Day streak</span></div>
        <div class="stat"><span class="stat-num">${xp}</span><span class="stat-lbl">XP earned</span></div>
        <div class="stat"><span class="stat-num">${decksCount}</span><span class="stat-lbl">Decks</span></div>
      </div>
      ${dueCards > 0 ? `<p>You have <strong>${dueCards} card${dueCards !== 1 ? 's' : ''}</strong> due for review today. Keep your streak alive!</p>` : '<p>No cards due today — great work staying on top of your reviews!</p>'}
      <div style="text-align:center">
        <a href="${APP_URL}/dashboard.html" class="btn">Go to dashboard →</a>
      </div>
    `,
  });

  return send({ to: user.email, subject: `BrainDeck: ${streakDays}-day streak — keep it going!`, html });
}

module.exports = {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendLoginNotificationEmail,
  sendWeeklyDigest,
};
