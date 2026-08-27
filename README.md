# St Mark's Gala — Smile Consultation Landing Page
Haberfield Dental Practice · Free Smile Consultation for the St Mark's community

## What this is
A single-page campaign landing page matching book.haberfielddentists.com.au, with a
registration form connected to SmileOx CRM via the email intake integration.

Flow: form → POST /api/submit → serverless function → SMTP2GO API (HTTPS)
→ TLS email delivery to the SmileOx intake address → lead created in the
St Mark's Community pipeline.

## Deploy (Vercel)
1. Push this folder to a repo (or `vercel deploy` directly).
2. Set environment variables in Vercel project settings:
   - SMTP2GO_API_KEY   your SMTP2GO API key
   - SMTP_FROM         no-reply@haberfielddentists.com.au (sender; the domain
                       must be verified in the SMTP2GO dashboard)
   Delivery runs over the SMTP2GO HTTPS API with TLS enforced end to end.
3. Deploy. Suggested domain: stmarks.haberfielddentists.com.au or
   book.haberfielddentists.com.au/st-marks (via rewrite).

## SmileOx intake
Intake address is hardcoded in api/submit.js:
st-marks-community+61e0a4c0-6810-448e-9607-d24bc54571c6@intake.smileox.com.au

Payload sent: firstName, lastName, email, phoneNumber, preferredTime, message,
source ("St Mark's Gala Landing Page"), submittedAt.
Duplicate email/phone submissions update the existing lead (SmileOx behaviour).

## Testing checklist (per SmileOx docs)
- [ ] Submit test form; confirm lead appears in the St Mark's Community pipeline
- [ ] Verify all fields arrive (preferredTime + message when provided)
- [ ] Confirm SMTP provider enforces TLS
- [ ] Check retry logs (one automatic retry is built in)

## Tracking
- GTM container GTM-WV62J5DN is included (same as book.haberfielddentists.com.au).
- Successful submits push dataLayer event: stmarks_consult_form_submit
- Phone links carry class .js-call for existing call tracking triggers.
- Confirm with GYA tracking setup that this page's triggers are configured.

## Notes
- QR code on the printed flyer and event program should point to this page's URL
  once deployed (#register anchor lands on the form).
- Page is noindex — campaign page, not for organic search.
