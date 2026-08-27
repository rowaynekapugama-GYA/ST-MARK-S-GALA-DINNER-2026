// /api/submit — Vercel serverless function
// Receives the landing page form POST and forwards it to the SmileOx
// CRM intake address as a plain-text JSON email via the SMTP2GO API.
// TLS is enforced end to end: HTTPS to SMTP2GO, TLS delivery to the intake domain.

const INTAKE_ADDRESS =
  "st-marks-community+61e0a4c0-6810-448e-9607-d24bc54571c6@intake.smileox.com.au";

const SMTP2GO_ENDPOINT = "https://api.smtp2go.com/v3/email/send";

const MAX_FIELD_LENGTH = 500;

function clean(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, MAX_FIELD_LENGTH);
  return trimmed.length ? trimmed : undefined;
}

async function sendViaSmtp2go(payload) {
  const res = await fetch(SMTP2GO_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Smtp2go-Api-Key": process.env.SMTP2GO_API_KEY,
    },
    body: JSON.stringify({
      sender: process.env.SMTP_FROM || "no-reply@haberfielddentists.com.au",
      to: [INTAKE_ADDRESS],
      subject: "Website form submission",
      text_body: JSON.stringify(payload),
    }),
  });

  const data = await res.json().catch(() => ({}));
  const succeeded = data && data.data && data.data.succeeded;
  if (!res.ok || !succeeded) {
    const detail =
      (data && data.data && (data.data.error || JSON.stringify(data.data.failures))) ||
      `HTTP ${res.status}`;
    throw new Error(`SMTP2GO send failed: ${detail}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.SMTP2GO_API_KEY) {
    console.error("SMTP2GO_API_KEY is not configured");
    return res.status(500).json({ error: "Sending service not configured" });
  }

  const body = req.body || {};

  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);
  const email = clean(body.email);
  const phoneNumber = clean(body.phoneNumber);

  if (!firstName || !lastName || !email || !phoneNumber) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }

  const payload = {
    firstName,
    lastName,
    email,
    phoneNumber,
    preferredTime: clean(body.preferredTime),
    message: clean(body.message),
    source: "St Mark's Gala Landing Page",
    submittedAt: new Date().toISOString(),
  };

  Object.keys(payload).forEach(
    (k) => payload[k] === undefined && delete payload[k]
  );

  // One retry on transient failure
  try {
    try {
      await sendViaSmtp2go(payload);
    } catch (firstErr) {
      console.warn("First attempt failed, retrying:", firstErr.message);
      await new Promise((r) => setTimeout(r, 1500));
      await sendViaSmtp2go(payload);
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err.message);
    return res.status(502).json({ error: "Failed to deliver submission" });
  }
}
