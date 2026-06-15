/**
 * Transactional email. Uses Resend when RESEND_API_KEY is configured; otherwise
 * it's a no-op and callers fall back to showing/copying the link in the UI.
 *
 * Env: RESEND_API_KEY, EMAIL_FROM (e.g. "Haylio <team@yourdomain.com>").
 */

const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "Haylio <onboarding@resend.dev>";

export const emailProviderEnabled = Boolean(RESEND_KEY);

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_KEY) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Email a team invite. Returns whether it was actually delivered. */
export async function sendTeamInvite(opts: {
  to: string;
  businessName: string;
  inviterName?: string;
  role: string;
  url: string;
}): Promise<{ delivered: boolean }> {
  const roleLabel = opts.role === "admin" ? "an admin" : "a member";
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#21201a">You've been invited to ${escapeHtml(opts.businessName)}</h2>
      <p style="color:#4a493f;font-size:15px;line-height:1.6">
        ${opts.inviterName ? escapeHtml(opts.inviterName) + " has" : "You've been"} invited you to join
        <strong>${escapeHtml(opts.businessName)}</strong> on Haylio as ${roleLabel}.
        Accept the invitation to log in with this email.
      </p>
      <p style="margin:28px 0">
        <a href="${opts.url}" style="background:#e8552f;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:15px">
          Accept invitation
        </a>
      </p>
      <p style="color:#8a897f;font-size:13px">Or paste this link into your browser:<br>${opts.url}</p>
    </div>`;
  const delivered = await send(opts.to, `Join ${opts.businessName} on Haylio`, html);
  return { delivered };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
