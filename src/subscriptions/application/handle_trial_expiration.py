from datetime import datetime, timedelta
from typing import List, Dict, Any
from src.subscriptions.infrastructure.persistence.mongo_subscription_repository import MongoSubscriptionRepository
from src.auth.infrastructure.persistence.mongo_user_repository import MongoUserRepository
from src.subscriptions.application.send_subscription_emails import SendSubscriptionEmails
from src.subscriptions.application.update_subscription_status import UpdateSubscriptionStatus
from src.subscriptions.domain.subscription_events import SubscriptionStatus

class HandleTrialExpiration:
    def __init__(self):
        self.subscription_repository = MongoSubscriptionRepository()
        self.user_repository = MongoUserRepository()
        self.email_service = SendSubscriptionEmails()
        self.update_subscription_status = UpdateSubscriptionStatus()

    async def check_expiring_trials(self, days_ahead: int = 3) -> Dict[str, Any]:
        try:
            target_date = datetime.utcnow() + timedelta(days=days_ahead)
            start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)

            expiring_trials = await self.subscription_repository.find_trials_expiring_between(
                start_date=start_of_day,
                end_date=end_of_day
            )

            results = {
                "check_date": datetime.utcnow(),
                "target_date": target_date,
                "days_ahead": days_ahead,
                "found_trials": len(expiring_trials),
                "notifications_sent": 0,
                "errors": []
            }

            for subscription in expiring_trials:
                try:
                    user = await self.user_repository.find_by_id(subscription.user_id)
                    if user:
                        success = await self.email_service.send_trial_ending_email(
                            user_email=user.email,
                            user_name=user.name,
                            plan_name=subscription.plan_type,
                            days_remaining=days_ahead
                        )
                        
                        if success:
                            results["notifications_sent"] += 1
                            await self._mark_trial_warning_sent(subscription.id)
                        else:
                            results["errors"].append(f"Failed to send email to {user.email}")
                    else:
                        results["errors"].append(f"User not found for subscription {subscription.id}")

                except Exception as e:
                    results["errors"].append(f"Error processing subscription {subscription.id}: {str(e)}")

            return results

        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [TRIAL_EXPIRATION] [ERROR] Failed to check expiring trials: {str(e)}")
            return {
                "error": str(e),
                "check_date": datetime.utcnow()
            }

    async def expire_trials(self) -> Dict[str, Any]:
        try:
            now = datetime.utcnow()
            expired_trials = await self.subscription_repository.find_expired_trials(now)

            results = {
                "check_date": now,
                "found_expired": len(expired_trials),
                "expired_successfully": 0,
                "errors": []
            }

            for subscription in expired_trials:
                try:
                    user = await self.user_repository.find_by_id(subscription.user_id)
                    if user:
                        await self.update_subscription_status.expire_trial(subscription.user_id)
                        
                        await self.email_service.send_subscription_expired_email(
                            user_email=user.email,
                            user_name=user.name,
                            plan_name=subscription.plan_type
                        )
                        
                        results["expired_successfully"] += 1
                    else:
                        results["errors"].append(f"User not found for subscription {subscription.id}")

                except Exception as e:
                    results["errors"].append(f"Error expiring subscription {subscription.id}: {str(e)}")

            return results

        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [TRIAL_EXPIRATION] [ERROR] Failed to expire trials: {str(e)}")
            return {
                "error": str(e),
                "check_date": datetime.utcnow()
            }

    async def get_trial_statistics(self) -> Dict[str, Any]:
        try:
            now = datetime.utcnow()
            
            active_trials = await self.subscription_repository.find_by_status("trialing")
            
            expiring_soon = []
            for trial in active_trials:
                if trial.trial_end:
                    days_remaining = (trial.trial_end - now).days
                    if days_remaining <= 7:
                        expiring_soon.append({
                            "subscription_id": trial.id,
                            "user_id": trial.user_id,
                            "plan_type": trial.plan_type,
                            "days_remaining": days_remaining,
                            "trial_end": trial.trial_end
                        })

            past_due_count = len(await self.subscription_repository.find_by_status("past_due"))
            expired_count = len(await self.subscription_repository.find_by_status("expired"))

            return {
                "active_trials": len(active_trials),
                "expiring_within_7_days": len(expiring_soon),
                "expiring_trials": expiring_soon,
                "past_due_subscriptions": past_due_count,
                "expired_subscriptions": expired_count,
                "generated_at": now
            }

        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [TRIAL_EXPIRATION] [ERROR] Failed to get statistics: {str(e)}")
            return {
                "error": str(e),
                "generated_at": datetime.utcnow()
            }

    async def extend_trial(self, user_id: str, additional_days: int) -> bool:
        try:
            subscription = await self.subscription_repository.find_by_user_id(user_id)
            if not subscription:
                return False

            if subscription.status != "trialing":
                return False

            if not subscription.trial_end:
                return False

            new_trial_end = subscription.trial_end + timedelta(days=additional_days)
            
            update_data = {
                "trial_end": new_trial_end,
                "updated_at": datetime.utcnow()
            }
            
            success = await self.subscription_repository.update(subscription.id, update_data)
            
            if success:
                user = await self.user_repository.find_by_id(user_id)
                if user:
                    await self.email_service.send_welcome_premium_email(
                        user_email=user.email,
                        user_name=user.name,
                        plan_name=subscription.plan_type
                    )

            return success

        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [TRIAL_EXPIRATION] [ERROR] Failed to extend trial: {str(e)}")
            return False

    async def convert_trial_to_paid(self, user_id: str, stripe_subscription_id: str) -> bool:
        try:
            subscription = await self.subscription_repository.find_by_user_id(user_id)
            if not subscription:
                return False

            if subscription.status != "trialing":
                return False

            update_data = {
                "status": SubscriptionStatus.ACTIVE.value,
                "stripe_subscription_id": stripe_subscription_id,
                "trial_start": None,
                "trial_end": None,
                "updated_at": datetime.utcnow()
            }
            
            success = await self.subscription_repository.update(subscription.id, update_data)
            
            if success:
                user = await self.user_repository.find_by_id(user_id)
                if user:
                    await self.email_service.send_payment_successful_email(
                        user_email=user.email,
                        user_name=user.name,
                        plan_name=subscription.plan_type
                    )

            return success

        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [TRIAL_EXPIRATION] [ERROR] Failed to convert trial: {str(e)}")
            return False

    async def _mark_trial_warning_sent(self, subscription_id: str) -> None:
        try:
            update_data = {
                "trial_warning_sent": True,
                "trial_warning_sent_at": datetime.utcnow()
            }
            await self.subscription_repository.update(subscription_id, update_data)
        except Exception as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [TRIAL_EXPIRATION] [ERROR] Failed to mark warning sent: {str(e)}")

    async def run_daily_trial_check(self) -> Dict[str, Any]:
        results = {
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "tasks_completed": []
        }

        try:
            expiring_check = await self.check_expiring_trials(days_ahead=3)
            results["tasks_completed"].append({
                "task": "check_expiring_trials_3_days",
                "result": expiring_check
            })

            expire_check = await self.expire_trials()
            results["tasks_completed"].append({
                "task": "expire_trials",
                "result": expire_check
            })

            stats = await self.get_trial_statistics()
            results["tasks_completed"].append({
                "task": "generate_statistics",
                "result": stats
            })

            results["success"] = True
            results["summary"] = {
                "trials_warned": expiring_check.get("notifications_sent", 0),
                "trials_expired": expire_check.get("expired_successfully", 0),
                "active_trials": stats.get("active_trials", 0)
            }

        except Exception as e:
            results["success"] = False
            results["error"] = str(e)
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [TRIAL_EXPIRATION] [ERROR] Daily check failed: {str(e)}")

        return results