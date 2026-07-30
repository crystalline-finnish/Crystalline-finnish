"""
Notification helpers for new quote requests.

Both send_new_quote_email() and send_new_quote_whatsapp() are designed to
NEVER raise -- if they're not configured (missing env vars) or the send
fails for any reason (bad credentials, network error, etc.), they log the
problem and return False. A notification failure should never cause a
customer's quote submission to fail; the quote is already saved in the
database by the time these are called.
"""

import logging
import smtplib
from email.mime.text import MIMEText

import requests

from config import Config

logger = logging.getLogger("crystalline.notifications")


def send_new_quote_email(quote):
    """quote: a QuoteRequest model instance (already committed to the DB)."""
    if not Config.SMTP_HOST or not Config.NOTIFY_TO_EMAIL:
        logger.info("Email notifications not configured -- skipping.")
        return False

    body = (
        f"New quote request received.\n\n"
        f"Name: {quote.name}\n"
        f"Phone: {quote.phone}\n"
        f"Email: {quote.email}\n"
        f"Location: {quote.location}\n"
        f"Product: {quote.product}\n"
        f"Measurements: {quote.measurements or '-'}\n"
        f"Notes: {quote.notes or '-'}\n"
        f"Files attached: {len(quote.files)}\n\n"
        f"View in the admin dashboard to respond."
    )
    message = MIMEText(body)
    message["Subject"] = f"New quote request: {quote.name} ({quote.product})"
    message["From"] = Config.NOTIFY_FROM_EMAIL
    message["To"] = Config.NOTIFY_TO_EMAIL

    try:
        with smtplib.SMTP(Config.SMTP_HOST, Config.SMTP_PORT, timeout=10) as server:
            if Config.SMTP_USE_TLS:
                server.starttls()
            if Config.SMTP_USERNAME and Config.SMTP_PASSWORD:
                server.login(Config.SMTP_USERNAME, Config.SMTP_PASSWORD)
            server.sendmail(Config.NOTIFY_FROM_EMAIL, [Config.NOTIFY_TO_EMAIL], message.as_string())
        logger.info(f"Sent quote notification email for quote #{quote.id}")
        return True
    except Exception as exc:
        logger.error(f"Failed to send quote notification email: {exc}")
        return False


def send_new_quote_whatsapp(quote):
    """Uses Meta's WhatsApp Business Cloud API (a plain HTTPS POST -- no SDK
    needed). Requires a WhatsApp Business account, a permanent access token,
    and a registered phone number ID from Meta's developer console.
    """
    if not Config.WHATSAPP_ACCESS_TOKEN or not Config.WHATSAPP_NOTIFY_NUMBER:
        logger.info("WhatsApp notifications not configured -- skipping.")
        return False

    url = f"https://graph.facebook.com/v20.0/{Config.WHATSAPP_PHONE_NUMBER_ID}/messages"
    headers = {
        "Authorization": f"Bearer {Config.WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }
    message_text = (
        f"New quote request:\n"
        f"{quote.name} ({quote.phone})\n"
        f"Product: {quote.product}\n"
        f"Location: {quote.location}"
    )
    payload = {
        "messaging_product": "whatsapp",
        "to": Config.WHATSAPP_NOTIFY_NUMBER,
        "type": "text",
        "text": {"body": message_text},
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        response.raise_for_status()
        logger.info(f"Sent WhatsApp notification for quote #{quote.id}")
        return True
    except Exception as exc:
        logger.error(f"Failed to send WhatsApp notification: {exc}")
        return False


def notify_new_quote_request(quote):
    """Fires both notification channels. Called right after a quote request
    is committed to the database. Never raises.
    """
    send_new_quote_email(quote)
    send_new_quote_whatsapp(quote)
