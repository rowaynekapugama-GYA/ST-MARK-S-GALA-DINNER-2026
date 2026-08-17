// /api/submit — Vercel serverless function
// Receives the landing page form POST and forwards it to the SmileOx
// CRM intake address as a plain-text JSON email over TLS SMTP.

import nodemailer from "nodemailer";

const INTAKE_ADDRESS =
  "st-marks-community+61e0a4c0-6810-448e-9607-d24bc54571c6@intake.smileox.com.au";

const MAX_FIELD_LENGTH = 500;

function clean(value) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, MAX_FIELD_LENGTH);
  return trimmed.length ? trimmed : undefined;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = req.body || {};

  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);
  const email = clean(body.email);
  const phoneNumber = clean(body.phoneNumber);

  // Required fields
  if (!firstName || !lastName || !email || !phoneNumber) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Basic shape checks
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

  // Strip undefined keys so the intake only stores what was provided
  Object.keys(payload).forEach(
    (k) => payload[k] === undefined && delete payload[k]
  );

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: true, // TLS enforced — required by SmileOx intake
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const send = () =>
    transporter.sendMail({
      to: INTAKE_ADDRESS,
      from: process.env.SMTP_FROM || "no-reply@haberfielddentists.com.au",
      subject: "Website form submission",
      text: JSON.stringify(payload),
    });

  // One retry on transient SMTP failure
  try {
    try {
      await send();
    } catch (firstErr) {
      console.warn("SMTP first attempt failed, retrying:", firstErr.message);
      await new Promise((r) => setTimeout(r, 1500));
      await send();
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("SMTP send failed:", err.message);
    return res.status(502).json({ error: "Failed to deliver submission" });
  }
}
