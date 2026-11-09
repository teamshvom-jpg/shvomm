import os
import smtplib
import ssl
import logging
from typing import Optional, Dict, Any, Tuple
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Ensure .env is loaded from standard locations
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))

from app.config.brand import BRAND_CONFIG

logger = logging.getLogger("shvom.mailer")
logging.basicConfig(level=logging.INFO)


def get_mail_config() -> Dict[str, Any]:
    """
    Dynamically loads and sanitizes mail credentials from the environment.
    """
    env_path = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
    load_dotenv(env_path, override=True)
    raw_pwd = os.getenv("SMTP_PASSWORD", "")
    # Remove all spaces from App Password (e.g. 'abcd efgh ijkl mnop' -> 'abcdefghijklmnop')
    clean_pwd = raw_pwd.strip().replace(" ", "") if raw_pwd else ""

    return {
        "smtp_host": os.getenv("SMTP_HOST", "smtp.hostinger.com").strip(),
        "smtp_port": int(os.getenv("SMTP_PORT", "465")),
        "smtp_user": os.getenv("SMTP_USER", "support@shvom.in").strip(),
        "smtp_password": clean_pwd,
        "mail_from": os.getenv("MAIL_FROM", "support@shvom.in").strip(),
        "team_email": os.getenv("TEAM_NOTIFICATION_EMAIL", "support@shvom.in").strip(),
        "resend_api_key": os.getenv("RESEND_API_KEY", "").strip(),
        "brevo_api_key": os.getenv("BREVO_API_KEY", "").strip(),
        "resend_from_domain": os.getenv("RESEND_FROM_DOMAIN", "Shvom Atelier <support@shvom.in>").strip(),
    }


def send_via_resend(cfg: Dict[str, Any], to_email: str, subject: str, html_body: str, text_body: str = "") -> Tuple[bool, str]:
    """
    Sends email via Resend HTTPS REST API (port 443).
    100% immune to Vercel/AWS/Render outbound SMTP socket blocking.

    Sender logic:
    - If RESEND_FROM_DOMAIN env var is set (e.g. "notifications@shvom.in"), use that as sender
      (requires the domain to be verified in Resend dashboard).
    - Otherwise fall back to onboarding@resend.dev which only delivers to the Resend account owner.
      In that case, to still reach team_email, we set reply-to so replies come back correctly.
    """
    try:
        import httpx
        from_header = cfg["mail_from"]

        # Use verified sender domain from config (set via RESEND_FROM_DOMAIN env var or defaults to support@shvom.in)
        resend_from = cfg.get("resend_from_domain", "").strip()
        if resend_from:
            sender = resend_from if "<" in resend_from else f"Shvom Atelier <{resend_from}>"
        elif "@gmail.com" in from_header.lower():
            # Resend free tier with no verified domain: can only deliver to account owner email.
            # We still attempt — if it's the same as team_email it'll work; otherwise log warning.
            sender = "Shvom Atelier <onboarding@resend.dev>"
            logger.info(
                f"[RESEND] Using onboarding@resend.dev sender. "
                f"Note: without a verified domain, Resend can only deliver to the account-owner email. "
                f"Set RESEND_FROM_DOMAIN env var with a verified domain sender to send to any address."
            )
        else:
            sender = f"Shvom Atelier <{from_header}>"

        payload = {
            "from": sender,
            "to": [to_email],
            "reply_to": cfg["team_email"],
            "subject": subject,
            "html": html_body,
        }
        if text_body:
            payload["text"] = text_body

        res = httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {cfg['resend_api_key']}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=12.0
        )
        if res.status_code in (200, 201):
            logger.info(f"[RESEND SUCCESS] Sent to {to_email}")
            return True, "Email sent via Resend API"
        else:
            err = res.text
            logger.warning(f"[RESEND FAILED] {res.status_code}: {err}")
            return False, f"Resend API error ({res.status_code}): {err}"
    except Exception as e:
        logger.error(f"[RESEND EXCEPTION] {e}")
        return False, str(e)


def send_via_brevo(cfg: Dict[str, Any], to_email: str, subject: str, html_body: str, text_body: str = "") -> Tuple[bool, str]:
    """
    Sends email via Brevo HTTPS REST API (port 443).
    """
    try:
        import httpx
        payload = {
            "sender": {"name": "Shvom Atelier", "email": cfg["mail_from"]},
            "to": [{"email": to_email}],
            "replyTo": {"email": cfg["team_email"], "name": "Shvom Concierge"},
            "subject": subject,
            "htmlContent": html_body,
        }
        if text_body:
            payload["textContent"] = text_body

        res = httpx.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "api-key": cfg["brevo_api_key"],
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=12.0
        )
        if res.status_code in (200, 201, 202):
            logger.info(f"[BREVO SUCCESS] Sent to {to_email}")
            return True, "Email sent via Brevo API"
        else:
            err = res.text
            logger.warning(f"[BREVO FAILED] {res.status_code}: {err}")
            return False, f"Brevo API error ({res.status_code}): {err}"
    except Exception as e:
        logger.error(f"[BREVO EXCEPTION] {e}")
        return False, str(e)


def send_via_smtp(cfg: Dict[str, Any], to_email: str, subject: str, html_body: str, text_body: str = "") -> Tuple[bool, str]:
    """
    Sends email via SMTP with intelligent port fallback (587 STARTTLS / 465 SSL).
    """
    host = cfg["smtp_host"]
    user = cfg["smtp_user"]
    pwd = cfg["smtp_password"]
    mail_from = cfg["mail_from"]

    if not host or not user or not pwd:
        msg = f"SMTP credentials missing (host='{host}', user='{user}', password_set={'yes' if pwd else 'no'})"
        logger.warning(f"[SIMULATED EMAIL] {msg}. Target: {to_email} | Subject: {subject}")
        return False, msg

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Shvom Atelier <{mail_from}>"
    msg["To"] = to_email
    msg["Reply-To"] = mail_from

    if text_body:
        msg.attach(MIMEText(text_body, "plain", "utf-8"))
    if html_body:
        msg.attach(MIMEText(html_body, "html", "utf-8"))

    raw_msg = msg.as_string()
    ports_to_try = [587, 465] if cfg["smtp_port"] == 587 else [465, 587]
    last_error = ""

    for port in ports_to_try:
        try:
            logger.info(f"Attempting SMTP to {host}:{port} for {to_email}...")
            if port == 465:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(host, port, context=context, timeout=12) as server:
                    server.login(user, pwd)
                    server.sendmail(mail_from, [to_email], raw_msg)
            else:
                context = ssl.create_default_context()
                with smtplib.SMTP(host, port, timeout=12) as server:
                    server.ehlo()
                    server.starttls(context=context)
                    server.ehlo()
                    server.login(user, pwd)
                    server.sendmail(mail_from, [to_email], raw_msg)

            logger.info(f"Email successfully delivered to {to_email} via SMTP port {port}")
            return True, f"Success via SMTP port {port}"
        except smtplib.SMTPAuthenticationError as auth_err:
            last_error = (
                f"Gmail authentication failed (BadCredentials). "
                f"Please ensure 2-Step Verification is ON for {user} and an App Password is used. Details: {auth_err}"
            )
            logger.error(f"[SMTP AUTH ERROR] {last_error}")
            break
        except smtplib.SMTPServerDisconnected as disc_err:
            last_error = (
                f"Gmail closed connection during authentication (typically Google 535 BadCredentials / invalid App Password). "
                f"Please verify 2-Step Verification is active on {user} and generate a fresh 16-character App Password at https://myaccount.google.com/apppasswords"
            )
            logger.error(f"[SMTP DISCONNECTED] {last_error}")
        except Exception as e:
            last_error = f"SMTP error on port {port}: {e}"
            logger.warning(f"[SMTP WARNING] {last_error}")

    return False, last_error


def send_email_notification(to_email: str, subject: str, html_body: str, text_body: str = "") -> bool:
    """
    Universal mail delivery dispatcher.
    Tries HTTPS REST APIs first (immune to serverless socket drops), then falls back to SMTP.
    """
    cfg = get_mail_config()

    # 1. Check for HTTPS REST APIs (best for Vercel Serverless)
    if cfg["resend_api_key"]:
        ok, reason = send_via_resend(cfg, to_email, subject, html_body, text_body)
        if ok:
            return True
        logger.warning(f"Resend failed, falling back to SMTP: {reason}")

    if cfg["brevo_api_key"]:
        ok, reason = send_via_brevo(cfg, to_email, subject, html_body, text_body)
        if ok:
            return True
        logger.warning(f"Brevo failed, falling back to SMTP: {reason}")

    # 2. Try SMTP
    ok, reason = send_via_smtp(cfg, to_email, subject, html_body, text_body)
    if ok:
        return True

    logger.error(f"[EMAIL DELIVERY FAILED] Could not send to {to_email}. Reason: {reason}")
    return False


def test_mail_diagnostics(target_email: Optional[str] = None) -> Dict[str, Any]:
    """
    Performs a live diagnostic check of the email configuration.
    """
    cfg = get_mail_config()
    recipient = target_email or cfg["team_email"]

    results = {
        "smtp_host": cfg["smtp_host"],
        "smtp_port": cfg["smtp_port"],
        "smtp_user": cfg["smtp_user"],
        "smtp_password_configured": bool(cfg["smtp_password"]),
        "smtp_password_length": len(cfg["smtp_password"]),
        "mail_from": cfg["mail_from"],
        "team_email": cfg["team_email"],
        "has_resend": bool(cfg["resend_api_key"]),
        "has_brevo": bool(cfg["brevo_api_key"]),
        "is_vercel": bool(os.environ.get("VERCEL")),
        "success": False,
        "message": ""
    }

    test_subject = "[DIAGNOSTIC] Shvom Atelier Mailer Live Test"
    test_html = """
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e0e0e0; max-width: 500px;">
        <h2 style="color: #b89b6a;">Shvom Atelier Email Test</h2>
        <p>This is a confirmation that your email dispatch engine is operational and connected.</p>
        <p style="color: #666; font-size: 12px;">Sent from Shvom Backend</p>
    </div>
    """

    ok, reason = send_via_smtp(cfg, recipient, test_subject, test_html, text_body="Shvom test email")
    results["success"] = ok
    results["message"] = reason
    return results


def format_specifications_section(answers: dict, special_notes: Optional[str] = None, logo_url: Optional[str] = None, reference_image_url: Optional[str] = None) -> Tuple[str, str]:
    """
    Builds both HTML and plaintext representations of all bespoke gift specifications.
    """
    if not answers and not special_notes and not logo_url and not reference_image_url:
        return "", ""

    labels_map = {
        "gift_category": "Hero Sensory Medium",
        "packaging_style": "Vessel & Box Architecture",
        "personalization_level": "Artisanal Personalization",
        "corporate_tone": "Branding & Aesthetic Tone",
        "corporate_branding_tone": "Branding & Aesthetic Tone",
        "company_name": "Company / Organization",
        "event_type": "Event / Milestone",
        "corporate_recipients": "Target Recipient Tiers",
        "corporate_vision": "Corporate Vision / Notes",
        "couple_names": "Couple Names",
        "wedding_date": "Wedding Date",
        "destination_city": "Venue & City",
        "wedding_aesthetic": "Atmosphere & Style Vibe",
        "monogram_text": "Monogram Inscription",
        "wedding_vision": "Wedding Vision / Notes"
    }

    from app.config.pricing import CATEGORY_BASE_RANGES

    def format_val(key: str, val: Any) -> str:
        if val is None or val == "":
            return "N/A"
        if isinstance(val, list):
            return ", ".join(str(i).replace("_", " ").title() for i in val)
        if isinstance(val, bool):
            return "Yes" if val else "No"
        val_str = str(val).strip()
        if key == "gift_category" and val_str in CATEGORY_BASE_RANGES:
            return CATEGORY_BASE_RANGES[val_str]["name"]
        if "_" in val_str and not val_str.startswith("http"):
            return val_str.replace("_", " ").title()
        return val_str

    rows_html = []
    text_lines = ["\nCurated Gift Specifications:"]

    priority_keys = [
        "gift_category",
        "packaging_style",
        "personalization_level",
        "company_name",
        "event_type",
        "corporate_recipients",
        "corporate_tone",
        "corporate_branding_tone",
        "corporate_vision",
        "couple_names",
        "wedding_date",
        "destination_city",
        "wedding_aesthetic",
        "monogram_text",
        "wedding_vision"
    ]

    seen = set()
    for k in priority_keys:
        if k in answers and answers[k]:
            label = labels_map.get(k, k.replace("_", " ").title())
            display_val = format_val(k, answers[k])
            rows_html.append(f"""
                <tr>
                    <td style="padding: 8px 12px; color: #8E8880; font-size: 13px; border-bottom: 1px solid #f0ece5; width: 38%;">{label}</td>
                    <td style="padding: 8px 12px; color: #1A1A1A; font-weight: 500; font-size: 13px; border-bottom: 1px solid #f0ece5;">{display_val}</td>
                </tr>
            """)
            text_lines.append(f"  • {label}: {display_val}")
            seen.add(k)

    skip_keys = {
        "client_name", "client_email", "client_phone", "delivery_city", "delivery_date",
        "consent", "quantity", "budget_range", "budget_per_gift", "special_notes",
        "logo_url", "reference_image_url"
    }

    for k, v in answers.items():
        if k not in seen and k not in skip_keys and v:
            label = labels_map.get(k, k.replace("_", " ").title())
            display_val = format_val(k, v)
            rows_html.append(f"""
                <tr>
                    <td style="padding: 8px 12px; color: #8E8880; font-size: 13px; border-bottom: 1px solid #f0ece5; width: 38%;">{label}</td>
                    <td style="padding: 8px 12px; color: #1A1A1A; font-weight: 500; font-size: 13px; border-bottom: 1px solid #f0ece5;">{display_val}</td>
                </tr>
            """)
            text_lines.append(f"  • {label}: {display_val}")

    if special_notes:
        rows_html.append(f"""
            <tr style="background: #faf8f5;">
                <td style="padding: 8px 12px; color: #B89B6A; font-weight: 600; font-size: 13px; border-bottom: 1px solid #f0ece5;">Patron's Bespoke Notes</td>
                <td style="padding: 8px 12px; color: #1A1A1A; font-style: italic; font-size: 13px; border-bottom: 1px solid #f0ece5;">"{special_notes}"</td>
            </tr>
        """)
        text_lines.append(f"  • Patron's Bespoke Notes: {special_notes}")

    if logo_url:
        rows_html.append(f"""
            <tr>
                <td style="padding: 8px 12px; color: #8E8880; font-size: 13px; border-bottom: 1px solid #f0ece5;">Attached Logo</td>
                <td style="padding: 8px 12px; color: #1A1A1A; font-size: 13px; border-bottom: 1px solid #f0ece5;"><a href="{logo_url}" target="_blank" style="color: #B89B6A; text-decoration: underline;">View Uploaded Logo File</a></td>
            </tr>
        """)
        text_lines.append(f"  • Attached Logo: {logo_url}")

    if reference_image_url:
        rows_html.append(f"""
            <tr>
                <td style="padding: 8px 12px; color: #8E8880; font-size: 13px; border-bottom: 1px solid #f0ece5;">Attached Moodboard</td>
                <td style="padding: 8px 12px; color: #1A1A1A; font-size: 13px; border-bottom: 1px solid #f0ece5;"><a href="{reference_image_url}" target="_blank" style="color: #B89B6A; text-decoration: underline;">View Reference Moodboard</a></td>
            </tr>
        """)
        text_lines.append(f"  • Attached Moodboard: {reference_image_url}")

    if not rows_html:
        return "", ""

    html = f"""
    <div style="margin-top: 24px;">
        <h3 style="font-size: 13px; font-weight: normal; letter-spacing: 0.12em; text-transform: uppercase; color: #B89B6A; margin-bottom: 8px; border-bottom: 1px solid #E5E0D8; padding-bottom: 6px;">
            Curated Gift Specifications
        </h3>
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #E5E0D8; background: #ffffff;">
            <thead>
                <tr style="background: #FAF8F5; border-bottom: 1px solid #E5E0D8;">
                    <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #8E8880;">Element</th>
                    <th style="padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #8E8880;">Selection</th>
                </tr>
            </thead>
            <tbody>
                {''.join(rows_html)}
            </tbody>
        </table>
    </div>
    """
    return html, "\n".join(text_lines)


def notify_team_new_request(request_data: dict):
    cfg = get_mail_config()
    # Resolve the admin dashboard URL — prefer env var, fall back to production URL
    admin_url = os.getenv("ADMIN_URL", "https://shvom.in/admin").rstrip("/")
    ref_id = request_data.get("reference_id", "N/A")
    patron_name = request_data.get("client_name", "Valued Patron")
    answers = request_data.get("answers") or {}
    special_notes = request_data.get("special_notes")
    logo_url = request_data.get("logo_url")
    reference_image_url = request_data.get("reference_image_url")

    specs_html, specs_text = format_specifications_section(
        answers=answers,
        special_notes=special_notes,
        logo_url=logo_url,
        reference_image_url=reference_image_url
    )

    subject = f"New Bespoke Commission Request [{ref_id}] - {patron_name}"
    html = f"""
    <div style="font-family: Georgia, serif; color: #1a1a1a; max-width: 640px; margin: 0 auto; padding: 24px; background: #faf8f5;">
        <h2 style="font-weight: normal; letter-spacing: 0.1em; border-bottom: 1px solid #e5e0d8; padding-bottom: 10px; margin-top: 0; color: #1a1a1a;">
            S H V O M &mdash; Commission Alert
        </h2>
        <p style="font-size: 14px; color: #5a5a58; line-height: 1.5;">
            A new bespoke gifting commission has been registered on the atelier platform.
        </p>

        <h3 style="font-size: 13px; font-weight: normal; letter-spacing: 0.12em; text-transform: uppercase; color: #B89B6A; margin: 20px 0 8px 0; border-bottom: 1px solid #E5E0D8; padding-bottom: 6px;">
            Patron & Logistics Overview
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: #ffffff; border: 1px solid #e5e0d8;">
            <tr><td style="padding: 8px 12px; color: #888; border-bottom: 1px solid #f0ece5; width: 38%;">Proposal Reference:</td><td style="padding: 8px 12px; font-weight: bold; color: #B89B6A; border-bottom: 1px solid #f0ece5;">{ref_id}</td></tr>
            <tr><td style="padding: 8px 12px; color: #888; border-bottom: 1px solid #f0ece5;">Patron Name:</td><td style="padding: 8px 12px; font-weight: bold; border-bottom: 1px solid #f0ece5;">{patron_name}</td></tr>
            <tr><td style="padding: 8px 12px; color: #888; border-bottom: 1px solid #f0ece5;">Email Address:</td><td style="padding: 8px 12px; border-bottom: 1px solid #f0ece5;"><a href="mailto:{request_data.get('client_email')}" style="color: #1a1a1a; text-decoration: underline;">{request_data.get('client_email')}</a></td></tr>
            <tr><td style="padding: 8px 12px; color: #888; border-bottom: 1px solid #f0ece5;">Telephone / WhatsApp:</td><td style="padding: 8px 12px; border-bottom: 1px solid #f0ece5;"><a href="tel:{request_data.get('client_phone')}" style="color: #1a1a1a;">{request_data.get('client_phone')}</a></td></tr>
            <tr><td style="padding: 8px 12px; color: #888; border-bottom: 1px solid #f0ece5;">Occasion:</td><td style="padding: 8px 12px; text-transform: capitalize; border-bottom: 1px solid #f0ece5;">{str(request_data.get('occasion', '')).replace('_', ' ')}</td></tr>
            <tr><td style="padding: 8px 12px; color: #888; border-bottom: 1px solid #f0ece5;">Volume:</td><td style="padding: 8px 12px; border-bottom: 1px solid #f0ece5;">{request_data.get('quantity')} units</td></tr>
            <tr><td style="padding: 8px 12px; color: #888; border-bottom: 1px solid #f0ece5;">Delivery Destination:</td><td style="padding: 8px 12px; border-bottom: 1px solid #f0ece5;">{request_data.get('delivery_city')} &bull; Target: {request_data.get('delivery_date')}</td></tr>
            <tr><td style="padding: 8px 12px; color: #888; border-bottom: 1px solid #f0ece5;">Indicative Investment:</td><td style="padding: 8px 12px; font-weight: bold; color: #1a1a1a; border-bottom: 1px solid #f0ece5;">INR ₹{request_data.get('estimated_min_total', 0):,.0f} &ndash; ₹{request_data.get('estimated_max_total', 0):,.0f}</td></tr>
            <tr><td style="padding: 8px 12px; color: #888;">Unit Budget Range:</td><td style="padding: 8px 12px; color: #5a5a58;">INR ₹{request_data.get('estimated_min_unit', 0):,.0f} &ndash; ₹{request_data.get('estimated_max_unit', 0):,.0f} / piece</td></tr>
        </table>

        {specs_html}

        <div style="margin-top: 28px; padding-top: 18px; border-top: 1px solid #e5e0d8; text-align: center;">
            <a href="{admin_url}" style="display: inline-block; background: #1A1A1A; color: #FAF8F5; text-decoration: none; padding: 12px 24px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; font-family: sans-serif;">
                Open Concierge Dashboard &rarr;
            </a>
            <p style="margin-top: 12px; font-size: 12px; color: #8E8880;">
                Direct login at <a href="{admin_url}" style="color: #B89B6A;">{admin_url}</a>
            </p>
        </div>
    </div>
    """

    text_body = f"""
    S H V O M — Commission Alert
    Reference: {ref_id}
    Patron: {patron_name}
    Email: {request_data.get('client_email')}
    Phone: {request_data.get('client_phone')}
    Occasion: {request_data.get('occasion')}
    Quantity: {request_data.get('quantity')} units
    City & Date: {request_data.get('delivery_city')} ({request_data.get('delivery_date')})
    Estimated Range: INR ₹{request_data.get('estimated_min_total', 0):,.0f} - ₹{request_data.get('estimated_max_total', 0):,.0f}
    {specs_text}

    Access Concierge Dashboard: {admin_url}
    """

    send_email_notification(cfg["team_email"], subject, html, text_body=text_body)


def send_client_confirmation(request_data: dict):
    """
    Sends a warm confirmation email to the customer immediately after they submit
    a gifting commission request — letting them know we've received it and will get back to them.
    """
    cfg = get_mail_config()
    ref_id = request_data.get('reference_id', 'N/A')
    client_name = request_data.get('client_name', 'Valued Patron')
    client_email = request_data.get('client_email', '')
    quantity = request_data.get('quantity', '')
    city = request_data.get('delivery_city', '')
    occasion = str(request_data.get('occasion', '')).replace('_', ' ').title()
    support_email = BRAND_CONFIG['contact']['support_email']

    if not client_email:
        logger.warning("[CLIENT CONFIRMATION] No client_email provided — skipping confirmation send.")
        return

    subject = f"We've Received Your Request — Ref: {ref_id} | Shvom"
    html = f"""
    <div style="font-family: Georgia, serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #faf8f5;">

        <!-- Header -->
        <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 24px; font-weight: normal; letter-spacing: 0.2em; margin: 0 0 6px 0;">S H V O M</h1>
            <p style="font-size: 12px; color: #b89b6a; margin: 0; font-style: italic; letter-spacing: 0.08em;">
                {BRAND_CONFIG['tagline']}
            </p>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e0d8; margin: 0 0 28px 0;" />

        <!-- Greeting -->
        <p style="font-size: 15px; margin: 0 0 16px 0;">Dear {client_name},</p>

        <!-- Main message -->
        <p style="font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">
            Thank you for reaching out to Shvom. We have <strong>successfully received your gifting commission request</strong>
            and our concierge team is already on it.
        </p>
        <p style="font-size: 15px; line-height: 1.7; margin: 0 0 24px 0;">
            We will review your requirements and get back to you within <strong>24 hours</strong> with a curated proposal,
            design moodboard, and customised quotation.
        </p>

        <!-- Reference box -->
        <div style="background: #ffffff; border: 1px solid #e5e0d8; border-left: 4px solid #b89b6a; padding: 18px 20px; margin: 0 0 24px 0; border-radius: 2px;">
            <p style="margin: 0 0 10px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.12em; color: #8e8880;">Your Request Summary</p>
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                <tr>
                    <td style="padding: 4px 0; color: #8e8880; width: 40%;">Reference ID</td>
                    <td style="padding: 4px 0; font-weight: bold; color: #b89b6a;">{ref_id}</td>
                </tr>
                {'<tr><td style="padding: 4px 0; color: #8e8880;">Occasion</td><td style="padding: 4px 0;">' + occasion + '</td></tr>' if occasion else ''}
                {'<tr><td style="padding: 4px 0; color: #8e8880;">Quantity</td><td style="padding: 4px 0;">' + str(quantity) + ' units</td></tr>' if quantity else ''}
                {'<tr><td style="padding: 4px 0; color: #8e8880;">Delivery City</td><td style="padding: 4px 0;">' + city + '</td></tr>' if city else ''}
            </table>
        </div>

        <!-- CTA / contact nudge -->
        <p style="font-size: 13px; line-height: 1.6; color: #5a5a58; margin: 0 0 28px 0;">
            In the meantime, if you have any questions or wish to add more details to your request,
            simply reply to this email or write to us at
            <a href="mailto:{support_email}" style="color: #1a1a1a; text-decoration: underline;">{support_email}</a>.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e0d8; margin: 0 0 20px 0;" />

        <!-- Sign-off -->
        <p style="font-size: 14px; margin: 0 0 4px 0;">Warmest regards,</p>
        <p style="font-size: 14px; font-weight: bold; margin: 0 0 4px 0;">The Concierge at Shvom</p>
        <p style="font-size: 12px; color: #8e8880; margin: 0;">
            <a href="mailto:{support_email}" style="color: #8e8880; text-decoration: none;">{support_email}</a>
        </p>

    </div>
    """

    text_body = f"""Dear {client_name},

Thank you for reaching out to Shvom. We have successfully received your gifting commission request and our concierge team is already on it.

We will get back to you within 24 hours with a curated proposal, design moodboard and customised quotation.

Your Request Details:
  Reference ID : {ref_id}
  Occasion     : {occasion}
  Quantity     : {quantity} units
  Delivery City: {city}

If you have any questions, reply to this email or write to us at {support_email}.

Warmest regards,
The Concierge at Shvom
{support_email}
"""

    send_email_notification(client_email, subject, html, text_body=text_body)


def notify_team_new_consultation(booking_data: dict):
    cfg = get_mail_config()
    subject = f"New Consultation Appointment - {booking_data.get('full_name')} ({booking_data.get('inquiry_type')})"
    html = f"""
    <div style="font-family: Georgia, serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="font-weight: normal; letter-spacing: 0.1em; border-bottom: 1px solid #e5e0d8; padding-bottom: 10px;">
            S H V O M &mdash; Consultation Appointment Alert
        </h2>
        <p>A new private consultation booking has been received.</p>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px; color: #888;">Client Name:</td><td style="padding: 6px; font-weight: bold;">{booking_data.get('full_name')}</td></tr>
            <tr><td style="padding: 6px; color: #888;">Email:</td><td style="padding: 6px;">{booking_data.get('email')}</td></tr>
            <tr><td style="padding: 6px; color: #888;">Phone:</td><td style="padding: 6px;">{booking_data.get('phone')}</td></tr>
            <tr><td style="padding: 6px; color: #888;">Inquiry Nature:</td><td style="padding: 6px;">{booking_data.get('inquiry_type')}</td></tr>
            <tr><td style="padding: 6px; color: #888;">Preferred Date & Slot:</td><td style="padding: 6px;">{booking_data.get('preferred_date') or 'Flexible'} &bull; {booking_data.get('preferred_time_slot')}</td></tr>
            <tr><td style="padding: 6px; color: #888;">Context / Notes:</td><td style="padding: 6px;">{booking_data.get('notes') or 'None'}</td></tr>
        </table>
        <p style="margin-top: 20px; font-size: 13px; color: #666;">
            Log in to the Admin Concierge portal to review or reschedule appointments.
        </p>
    </div>
    """
    text = f"""
    New Consultation Request:
    Name: {booking_data.get('full_name')}
    Email: {booking_data.get('email')}
    Phone: {booking_data.get('phone')}
    Type: {booking_data.get('inquiry_type')}
    Date: {booking_data.get('preferred_date')} ({booking_data.get('preferred_time_slot')})
    Notes: {booking_data.get('notes')}
    """
    send_email_notification(cfg["team_email"], subject, html, text_body=text)


def send_consultation_client_confirmation(booking_data: dict):
    subject = "Your Consultation Request Received | Shvom Atelier"
    html = f"""
    <div style="font-family: Georgia, serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 24px; background: #faf8f5;">
        <h1 style="font-size: 22px; font-weight: normal; letter-spacing: 0.15em; text-align: center; margin-bottom: 8px;">
            S H V O M
        </h1>
        <p style="text-align: center; font-size: 12px; color: #b89b6a; margin-top: 0; font-style: italic;">
            {BRAND_CONFIG['tagline']}
        </p>
        <hr style="border: none; border-top: 1px solid #e5e0d8; margin: 20px 0;" />
        <p>Dear {booking_data.get('full_name')},</p>
        <p>
            Thank you for requesting a private consultation with Shvom Bespoke Gifting Studio. We have safely received your appointment details.
        </p>
        <div style="background: #ffffff; padding: 16px; border: 1px solid #e5e0d8; margin: 20px 0; font-size: 14px;">
            <p style="margin: 0 0 8px 0; color: #8e8880; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Appointment Preferences</p>
            <p style="margin: 4px 0;"><strong>Inquiry Type:</strong> {booking_data.get('inquiry_type')}</p>
            <p style="margin: 4px 0;"><strong>Preferred Date:</strong> {booking_data.get('preferred_date') or 'To be coordinated'}</p>
            <p style="margin: 4px 0;"><strong>Preferred Slot:</strong> {booking_data.get('preferred_time_slot')}</p>
        </div>
        <p>
            Our senior atelier concierge will review your schedule and reach out directly within one business day with appointment confirmation, virtual link, or atelier access and parking directions.
        </p>
        <p style="font-size: 13px; color: #5a5a58;">
            For immediate assistance or to update your schedule, feel free to reply directly to this email or reach us at 
            <a href="mailto:{BRAND_CONFIG['contact']['email']}" style="color: #1a1a1a;">{BRAND_CONFIG['contact']['email']}</a> 
            or via WhatsApp at {BRAND_CONFIG['contact']['phone']}.
        </p>
        <p style="margin-top: 30px; font-size: 14px;">Warmest regards,<br/><strong>The Concierge at Shvom</strong></p>
    </div>
    """
    text = f"""
    Dear {booking_data.get('full_name')},

    Thank you for requesting a private consultation with Shvom Bespoke Gifting Studio. We have received your appointment request for {booking_data.get('inquiry_type')}.

    Our concierge will reach out to you within one business day with confirmation.

    Warmest regards,
    The Concierge at Shvom
    {BRAND_CONFIG['contact']['email']}
    """
    send_email_notification(booking_data.get("email"), subject, html, text_body=text)


def send_payment_confirmation(payment_data: dict):
    """
    Sends a branded Tax Invoice / Payment Confirmation email to the customer
    immediately after a successful payment record is created.

    payment_data keys (from PaymentRecord):
        transaction_id, amount, customer_name, customer_email,
        customer_phone, reference_code, purpose, payment_method,
        status, created_at, notes
    """
    cfg = get_mail_config()

    txn_id       = payment_data.get("transaction_id", "N/A")
    customer     = payment_data.get("customer_name", "Valued Patron")
    customer_email = payment_data.get("customer_email", "")
    amount       = payment_data.get("amount", 0.0)
    purpose      = payment_data.get("purpose", "Commission Advance")
    method       = payment_data.get("payment_method", "UPI")
    status       = payment_data.get("status", "Completed")
    ref_code     = payment_data.get("reference_code") or "—"
    phone        = payment_data.get("customer_phone") or "—"
    notes        = payment_data.get("notes") or "—"
    created_at   = payment_data.get("created_at", "")

    # Format created_at nicely
    try:
        from datetime import datetime as _dt
        if isinstance(created_at, str):
            dt = _dt.fromisoformat(created_at.replace("Z", ""))
        else:
            dt = created_at
        date_str = dt.strftime("%d %B %Y, %I:%M %p IST")
    except Exception:
        date_str = str(created_at)

    # GST breakdown (18% inclusive)
    taxable   = amount / 1.18
    cgst      = amount * 9 / 118
    sgst      = amount * 9 / 118

    subject = f"Payment Confirmation — ₹{amount:,.0f} | Shvom Enterprises [{txn_id}]"

    html = f"""
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #1A1A1A; max-width: 620px; margin: 0 auto; background: #FAF8F5; border: 1px solid #E7E3DC;">

      <!-- HEADER BAND -->
      <div style="background: #1A1A1A; padding: 28px 32px 20px; text-align: center;">
        <p style="margin: 0; font-size: 24px; letter-spacing: 0.32em; color: #FAF8F5; font-weight: 400;">SHVOM</p>
        <p style="margin: 4px 0 0 0; font-size: 10px; letter-spacing: 0.22em; color: #B89B6A; text-transform: uppercase; font-family: Arial, sans-serif;">Enterprises</p>
        <p style="margin: 10px 0 0 0; font-size: 10px; letter-spacing: 0.16em; color: #8E8880; text-transform: uppercase; font-family: Arial, sans-serif;">Payment Confirmation</p>
      </div>

      <!-- GOLD RULE -->
      <div style="height: 3px; background: linear-gradient(to right, #B89B6A, #D4BE96, #B89B6A);"></div>

      <!-- BODY -->
      <div style="padding: 32px 32px 24px;">

        <!-- Greeting -->
        <p style="font-size: 15px; margin: 0 0 12px 0;">Dear {customer},</p>
        <p style="font-size: 14px; color: #5A5A58; line-height: 1.7; margin: 0 0 24px 0;">
          We are pleased to confirm that your payment has been received and duly recorded by Shvom Enterprises.
          Please retain this confirmation for your reference.
        </p>

        <!-- Success badge -->
        <div style="text-align: center; margin-bottom: 28px;">
          <div style="display: inline-block; background: #F0FBF4; border: 1px solid #86EFAC; border-radius: 40px; padding: 8px 22px;">
            <span style="font-family: Arial, sans-serif; font-size: 12px; color: #166534; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700;">
              ✓ &nbsp;Payment {status}
            </span>
          </div>
        </div>

        <!-- Amount hero -->
        <div style="background: #ffffff; border: 1px solid #E7E3DC; border-radius: 8px; padding: 20px 24px; text-align: center; margin-bottom: 24px;">
          <p style="margin: 0; font-family: Arial, sans-serif; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #8E8880;">Amount Paid</p>
          <p style="margin: 8px 0 0 0; font-size: 34px; font-weight: 700; color: #1A1A1A; letter-spacing: 0.04em;">₹{amount:,.2f}</p>
          <p style="margin: 4px 0 0 0; font-family: Arial, sans-serif; font-size: 11px; color: #B89B6A; letter-spacing: 0.1em;">{purpose}</p>
        </div>

        <!-- Receipt table -->
        <h3 style="font-family: Arial, sans-serif; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #B89B6A; margin: 0 0 8px 0; border-bottom: 1px solid #E7E3DC; padding-bottom: 6px;">
          Transaction Receipt
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 13px; margin-bottom: 24px;">
          <tr style="border-bottom: 1px solid #F0EDE8;">
            <td style="padding: 9px 0; color: #8E8880; width: 42%;">Transaction ID</td>
            <td style="padding: 9px 0; color: #1A1A1A; font-family: 'Courier New', monospace; font-weight: 600;">{txn_id}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EDE8;">
            <td style="padding: 9px 0; color: #8E8880;">Date &amp; Time</td>
            <td style="padding: 9px 0; color: #1A1A1A;">{date_str}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EDE8;">
            <td style="padding: 9px 0; color: #8E8880;">Customer Name</td>
            <td style="padding: 9px 0; color: #1A1A1A;">{customer}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EDE8;">
            <td style="padding: 9px 0; color: #8E8880;">Email</td>
            <td style="padding: 9px 0; color: #1A1A1A;">{customer_email}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EDE8;">
            <td style="padding: 9px 0; color: #8E8880;">Phone</td>
            <td style="padding: 9px 0; color: #1A1A1A;">{phone}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EDE8;">
            <td style="padding: 9px 0; color: #8E8880;">Reference Code</td>
            <td style="padding: 9px 0; color: #1A1A1A;">{ref_code}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EDE8;">
            <td style="padding: 9px 0; color: #8E8880;">Payment Purpose</td>
            <td style="padding: 9px 0; color: #1A1A1A;">{purpose}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EDE8;">
            <td style="padding: 9px 0; color: #8E8880;">Payment Method</td>
            <td style="padding: 9px 0; color: #1A1A1A;">{method}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EDE8;">
            <td style="padding: 9px 0; color: #8E8880;">Notes</td>
            <td style="padding: 9px 0; color: #5A5A58; font-style: italic;">{notes}</td>
          </tr>
        </table>

        <!-- GST breakdown -->
        <h3 style="font-family: Arial, sans-serif; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: #B89B6A; margin: 0 0 8px 0; border-bottom: 1px solid #E7E3DC; padding-bottom: 6px;">
          Tax Summary (GST 18% Inclusive)
        </h3>
        <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 13px; margin-bottom: 24px;">
          <tr style="border-bottom: 1px solid #F0EDE8;">
            <td style="padding: 7px 0; color: #8E8880;">Taxable Value (Base)</td>
            <td style="padding: 7px 0; text-align: right; color: #1A1A1A;">₹{taxable:,.2f}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EDE8;">
            <td style="padding: 7px 0; color: #8E8880;">CGST @ 9%</td>
            <td style="padding: 7px 0; text-align: right; color: #1A1A1A;">₹{cgst:,.2f}</td>
          </tr>
          <tr style="border-bottom: 1px solid #F0EDE8;">
            <td style="padding: 7px 0; color: #8E8880;">SGST @ 9%</td>
            <td style="padding: 7px 0; text-align: right; color: #1A1A1A;">₹{sgst:,.2f}</td>
          </tr>
          <tr style="background: #1A1A1A;">
            <td style="padding: 10px 8px; color: #FAF8F5; font-weight: 700;">Total Paid</td>
            <td style="padding: 10px 8px; text-align: right; color: #FAF8F5; font-weight: 700; font-size: 15px;">₹{amount:,.2f}</td>
          </tr>
        </table>

        <!-- Footer note -->
        <div style="background: #FBF5EB; border-left: 3px solid #B89B6A; padding: 12px 16px; font-family: Arial, sans-serif; font-size: 12px; color: #5A5A58; line-height: 1.6; margin-bottom: 28px;">
          For any queries regarding this payment, please quote your Transaction ID <strong style="color: #1A1A1A;">{txn_id}</strong> in all correspondence.
          You may reach us at <a href="mailto:{BRAND_CONFIG['contact']['email']}" style="color: #B89B6A;">{BRAND_CONFIG['contact']['email']}</a>.
        </div>

        <!-- Signoff -->
        <p style="font-size: 14px; margin: 0 0 4px 0;">Warmest regards,</p>
        <p style="font-size: 14px; font-weight: bold; margin: 0 0 2px 0;">Shvom Enterprises</p>
        <p style="font-family: Arial, sans-serif; font-size: 12px; color: #8E8880; margin: 0;">Authorised Signatory</p>

      </div>

      <!-- FOOTER BAND -->
      <div style="background: #1A1A1A; padding: 16px 32px; text-align: center;">
        <p style="margin: 0; font-family: Arial, sans-serif; font-size: 10px; color: #5A5A58; line-height: 1.8;">
          Shvom Enterprises · Telangana, India<br/>
          GSTIN: 36AHEPC4719K1ZD · {BRAND_CONFIG['contact']['email']}<br/>
          <em style="color: #B89B6A;">The Art of the Thoughtful Departure</em>
        </p>
      </div>

    </div>
    """

    text_body = f"""
SHVOM ENTERPRISES — PAYMENT CONFIRMATION
=========================================
Transaction ID : {txn_id}
Date & Time    : {date_str}
Customer       : {customer} ({customer_email})
Phone          : {phone}

Amount Paid    : INR Rs.{amount:,.2f}
Purpose        : {purpose}
Method         : {method}
Reference Code : {ref_code}
Status         : {status}

GST Summary (18% inclusive):
  Taxable Base : Rs.{taxable:,.2f}
  CGST (9%)    : Rs.{cgst:,.2f}
  SGST (9%)    : Rs.{sgst:,.2f}
  TOTAL        : Rs.{amount:,.2f}

For queries, quote Transaction ID {txn_id}
Contact: {BRAND_CONFIG['contact']['email']} | {BRAND_CONFIG['contact']['phone']}

Vasanta — The Art of the Thoughtful Departure
"""

    logger.info(f"[PAYMENT MAIL] Sending confirmation to {customer_email} for {txn_id}")
    success = send_email_notification(customer_email, subject, html, text_body=text_body)
    if success:
        logger.info(f"[PAYMENT MAIL] ✓ Confirmation delivered to {customer_email}")
    else:
        logger.warning(f"[PAYMENT MAIL] ✗ Failed to deliver confirmation to {customer_email}")
    return success

