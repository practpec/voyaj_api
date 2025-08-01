from typing import Dict, Any, Optional
from datetime import datetime
from src.shared.infrastructure.services.email_service import EmailService
from src.shared.infrastructure.templates.subscription_templates import SubscriptionTemplates
from src.shared.infrastructure.templates.subscription_subjects import SubscriptionSubjects

class SendSubscriptionEmails:
    def __init__(self):
        self.email_service = EmailService()
        self.templates = SubscriptionTemplates()
        self.subjects = SubscriptionSubjects()

    async def send_welcome_free_email(self, user_email: str, user_name: str) -> bool:
        template_data = {
            "user_name": user_name,
            "app_name": "Voyaj"
        }
        return await self._send_subscription_email(
            to_email=user_email,
            template_type="welcome_free",
            template_data=template_data
        )

    async def send_welcome_premium_email(
        self, 
        user_email: str, 
        user_name: str, 
        plan_name: str
    ) -> bool:
        template_data = {
            "user_name": user_name,
            "plan_name": plan_name,
            "app_name": "Voyaj"
        }
        return await self._send_subscription_email(
            to_email=user_email,
            template_type="welcome_premium",
            template_data=template_data
        )

    async def send_payment_pending_email(
        self, 
        user_email: str, 
        user_name: str, 
        plan_name: str
    ) -> bool:
        template_data = {
            "user_name": user_name,
            "plan_name": plan_name,
            "app_name": "Voyaj"
        }
        return await self._send_subscription_email(
            to_email=user_email,
            template_type="payment_pending",
            template_data=template_data
        )

    async def send_payment_successful_email(
        self, 
        user_email: str, 
        user_name: str, 
        plan_name: str
    ) -> bool:
        template_data = {
            "user_name": user_name,
            "plan_name": plan_name,
            "app_name": "Voyaj"
        }
        return await self._send_subscription_email(
            to_email=user_email,
            template_type="payment_successful",
            template_data=template_data
        )

    async def send_payment_failed_email(
        self, 
        user_email: str, 
        user_name: str, 
        retry_url: Optional[str] = None
    ) -> bool:
        template_data = {
            "user_name": user_name,
            "retry_url": retry_url,
            "app_name": "Voyaj"
        }
        return await self._send_subscription_email(
            to_email=user_email,
            template_type="payment_failed",
            template_data=template_data
        )

    async def send_subscription_renewed_email(
        self, 
        user_email: str, 
        user_name: str, 
        plan_name: str
    ) -> bool:
        template_data = {
            "user_name": user_name,
            "plan_name": plan_name,
            "app_name": "Voyaj"
        }
        return await self._send_subscription_email(
            to_email=user_email,
            template_type="subscription_renewed",
            template_data=template_data
        )

    async def send_upgrade_confirmation_email(
        self, 
        user_email: str, 
        user_name: str, 
        plan_name: str
    ) -> bool:
        template_data = {
            "user_name": user_name,
            "plan_name": plan_name,
            "app_name": "Voyaj"
        }
        return await self._send_subscription_email(
            to_email=user_email,
            template_type="upgrade_confirmation",
            template_data=template_data
        )

    async def send_downgrade_warning_email(
        self, 
        user_email: str, 
        user_name: str, 
        access_until: Optional[datetime] = None
    ) -> bool:
        template_data = {
            "user_name": user_name,
            "access_until": access_until.strftime("%d/%m/%Y") if access_until else "el final del período",
            "app_name": "Voyaj"
        }
        return await self._send_subscription_email(
            to_email=user_email,
            template_type="downgrade_warning",
            template_data=template_data
        )

    async def send_cancellation_confirmation_email(
        self, 
        user_email: str, 
        user_name: str, 
        plan_name: str,
        access_until: Optional[datetime] = None
    ) -> bool:
        template_data = {
            "user_name": user_name,
            "plan_name": plan_name,
            "access_until": access_until.strftime("%d/%m/%Y") if access_until else "el final del período pagado",
            "app_name": "Voyaj"
        }
        return await self._send_subscription_email(
            to_email=user_email,
            template_type="cancellation_confirmation",
            template_data=template_data
        )

    async def send_limit_reached_email(
        self, 
        user_email: str, 
        user_name: str, 
        limit_message: str
    ) -> bool:
        template_data = {
            "user_name": user_name,
            "limit_message": limit_message,
            "app_name": "Voyaj"
        }
        return await self._send_subscription_email(
            to_email=user_email,
            template_type="limit_reached",
            template_data=template_data
        )

    async def send_trial_ending_email(
        self, 
        user_email: str, 
        user_name: str, 
        plan_name: str,
        days_remaining: int = 3
    ) -> bool:
        template_data = {
            "user_name": user_name,
            "plan_name": plan_name,
            "days_remaining": days_remaining,
            "app_name": "Voyaj"
        }
        return await self._send_subscription_email(
            to_email=user_email,
            template_type="trial_ending",
            template_data=template_data
        )

    async def send_subscription_expired_email(
        self, 
        user_email: str, 
        user_name: str, 
        plan_name: str
    ) -> bool:
        template_data = {
            "user_name": user_name,
            "plan_name": plan_name,
            "app_name": "Voyaj"
        }
        return await self._send_subscription_email(
            to_email=user_email,
            template_type="subscription_expired",
            template_data=template_data
        )

    async def _send_subscription_email(
        self,
        to_email: str,
        template_type: str,
        template_data: Dict[str, Any]
    ) -> bool:
        try:
            subject = self.subjects.get_subject(template_type)
            html_content = self.templates.get_template(template_type, template_data)

            success = await self.email_service.send_email(
                to_email=to_email,
                template_type=template_type,
                template_data=template_data
            )

            if success:
                await self._log_email_sent(to_email, template_type, "success")
            else:
                await self._log_email_sent(to_email, template_type, "failed")

            return success

        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [SUBSCRIPTION_EMAILS] [ERROR] Failed to send {template_type} email to {to_email}: {str(e)}")
            await self._log_email_sent(to_email, template_type, "error", str(e))
            return False

    async def _log_email_sent(
        self, 
        to_email: str, 
        template_type: str, 
        status: str, 
        error_message: str = None
    ) -> None:
        try:
            from src.shared.infrastructure.database.mongo_client import get_database
            db = get_database()
            collection = db.subscription_emails_log
            
            log_entry = {
                "to_email": to_email,
                "template_type": template_type,
                "status": status,
                "timestamp": datetime.utcnow(),
                "error_message": error_message
            }
            
            await collection.insert_one(log_entry)
            
        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [SUBSCRIPTION_EMAILS] [ERROR] Failed to log email: {str(e)}")

    async def send_batch_emails(self, email_batch: list) -> Dict[str, Any]:
        results = {
            "total": len(email_batch),
            "successful": 0,
            "failed": 0,
            "errors": []
        }

        for email_data in email_batch:
            try:
                template_type = email_data["template_type"]
                success = await self._send_subscription_email(
                    to_email=email_data["to_email"],
                    template_type=template_type,
                    template_data=email_data["template_data"]
                )
                
                if success:
                    results["successful"] += 1
                else:
                    results["failed"] += 1
                    results["errors"].append(f"Failed to send {template_type} to {email_data['to_email']}")
                    
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"Error processing email: {str(e)}")

        return results

    async def get_email_statistics(self, days: int = 30) -> Dict[str, Any]:
        try:
            from src.shared.infrastructure.database.mongo_client import get_database
            from datetime import timedelta
            
            db = get_database()
            collection = db.subscription_emails_log
            
            start_date = datetime.utcnow() - timedelta(days=days)
            
            pipeline = [
                {"$match": {"timestamp": {"$gte": start_date}}},
                {"$group": {
                    "_id": {
                        "template_type": "$template_type",
                        "status": "$status"
                    },
                    "count": {"$sum": 1}
                }},
                {"$group": {
                    "_id": "$_id.template_type",
                    "statuses": {"$push": {
                        "status": "$_id.status",
                        "count": "$count"
                    }},
                    "total": {"$sum": "$count"}
                }}
            ]
            
            stats = {}
            async for result in collection.aggregate(pipeline):
                template_type = result["_id"]
                stats[template_type] = {
                    "total": result["total"],
                    "statuses": {s["status"]: s["count"] for s in result["statuses"]}
                }
            
            total_emails = sum(s["total"] for s in stats.values())
            success_rate = 0
            if total_emails > 0:
                total_successful = sum(
                    s["statuses"].get("success", 0) for s in stats.values()
                )
                success_rate = (total_successful / total_emails) * 100

            return {
                "period_days": days,
                "total_emails": total_emails,
                "success_rate": round(success_rate, 2),
                "by_template": stats,
                "generated_at": datetime.utcnow()
            }
            
        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [SUBSCRIPTION_EMAILS] [ERROR] Failed to get statistics: {str(e)}")
            return {
                "error": "Failed to generate statistics",
                "period_days": days,
                "generated_at": datetime.utcnow()
            }