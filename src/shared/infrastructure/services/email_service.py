import smtplib
import random
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any
from src.shared.config import settings
from src.shared.infrastructure.templates.email_templates import EmailTemplates
from src.shared.infrastructure.templates.email_subjects import EmailSubjects

class EmailService:
    def __init__(self):
        self.smtp_host = settings.smtp_host
        self.smtp_port = settings.smtp_port
        self.smtp_user = settings.smtp_user
        self.smtp_pass = settings.smtp_pass
        self.from_email = settings.from_email
        self.from_name = settings.from_name
        self.templates = EmailTemplates()
        self.subjects = EmailSubjects()

    def generate_verification_token(self) -> tuple[str, datetime]:
        token = str(random.randint(100000, 999999))
        expires_at = datetime.utcnow() + timedelta(hours=24)
        return token, expires_at

    def generate_reset_token(self) -> tuple[str, datetime]:
        token = str(random.randint(100000, 999999))
        expires_at = datetime.utcnow() + timedelta(hours=1)
        return token, expires_at

    async def send_email(
        self, 
        to_email: str, 
        template_type: str, 
        template_data: Dict[str, Any]
    ) -> bool:
        try:
            # Templates de AUTH (verificación, reset password)
            auth_templates = ["verification", "password_reset"]
            
            # Templates de SUSCRIPCIONES
            subscription_templates = [
                "payment_successful", "cancellation_confirmation", "welcome_free", 
                "welcome_premium", "payment_failed", "subscription_renewed", 
                "upgrade_confirmation", "downgrade_warning", "limit_reached", 
                "trial_ending", "subscription_expired", "payment_pending"
            ]
            
            if template_type in subscription_templates:
                # Usar templates de suscripciones
                from src.shared.infrastructure.templates.subscription_subjects import SubscriptionSubjects
                from src.shared.infrastructure.templates.subscription_templates import SubscriptionTemplates
                subjects = SubscriptionSubjects()
                templates = SubscriptionTemplates()
                subject = subjects.get_subject(template_type)
                html_content = templates.get_template(template_type, template_data)
            elif template_type in auth_templates:
                # Usar templates de auth (los originales)
                subject = self.subjects.get_subject(template_type)
                html_content = self.templates.get_template(template_type, template_data)
            else:
                # Template desconocido
                raise ValueError(f"Unknown template type: {template_type}")

            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email

            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)

            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_pass)
                server.send_message(msg)

            return True

        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [EMAIL_SERVICE] [ERROR] Failed to send email to {to_email}: {str(e)}")
            return False

    async def send_verification_email(self, to_email: str, user_name: str, token: str) -> bool:
        template_data = {
            "user_name": user_name,
            "verification_token": token,
            "app_name": "Voyaj"
        }
        return await self.send_email(to_email, "verification", template_data)

    async def send_password_reset_email(self, to_email: str, user_name: str, token: str) -> bool:
        template_data = {
            "user_name": user_name,
            "reset_token": token,
            "app_name": "Voyaj"
        }
        return await self.send_email(to_email, "password_reset", template_data)