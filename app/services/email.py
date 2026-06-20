import smtplib
import ssl
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import get_settings

logger = logging.getLogger(__name__)


def send_license_email(
    client_name: str,
    client_email: str,
    license_key: str,
    features: list[str],
    expires_at: str | None,
) -> bool:
    """
    Šalje welcome email klijentu sa license key-em.
    Vraća True ako je email poslan, False ako je SMTP onemogućen ili je greška.
    Nikad ne diže exception — greška se samo loguje.
    """
    settings = get_settings()
    if not settings.smtp_enabled:
        logger.info("SMTP nije konfigurisan — preskačem email za %s", client_email)
        return False

    try:
        subject = f"PanBI licenca — dobrodošli, {client_name}!"

        features_display = ", ".join(features) if features else "—"
        expires_display = expires_at if expires_at else "Bez roka"

        body_text = f"""Poštovani/a {client_name},

Vaša PanBI licenca je uspješno kreirana.

LICENCNI KLJUČ:
{license_key}

Detalji licence:
- Moduli: {features_display}
- Ističe: {expires_display}

Koraci za aktivaciju:
1. Instalirajte PanConnect i pokrenite ga s ovim ključem (LICENSE_KEY env varijabla)
2. Pokrenite PanBI setup wizard: pnpm setup
3. Unesite URL i API ključ vašeg PanConnect servisa
4. Provjerite status licence na: /admin/settings/license

Za podršku kontaktirajte vašeg PanBI partnera.

---
Ova poruka je automatski generisana. Molimo ne odgovarajte na ovu email adresu.
"""

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = client_email
        msg.attach(MIMEText(body_text, "plain", "utf-8"))

        if settings.SMTP_USE_TLS:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.ehlo()
                server.starttls(context=ssl.create_default_context())
                server.ehlo()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, [client_email], msg.as_string())
        else:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=context, timeout=10) as server:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, [client_email], msg.as_string())

        logger.info("License email poslan na %s", client_email)
        return True

    except Exception as e:
        logger.error("Greška pri slanju email-a na %s: %s", client_email, e)
        return False
