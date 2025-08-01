import asyncio
from datetime import datetime
from src.subscriptions.application.subscription_service import SubscriptionService
from src.subscriptions.application.expiration_notification_service import ExpirationNotificationService

class SubscriptionScheduler:
    def __init__(self):
        self.subscription_service = SubscriptionService()
        self.expiration_service = ExpirationNotificationService()

    async def run_daily_tasks(self) -> dict:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [SCHEDULER] Running daily subscription tasks")
        
        results = {
            "expired_processed": 0,
            "notifications_sent": 0,
            "executed_at": timestamp
        }

        try:
            # Procesar suscripciones expiradas
            expired_count = await self.subscription_service.process_expired_subscriptions()
            results["expired_processed"] = expired_count
            
            # Enviar notificaciones de expiración (7 días antes)
            notifications_sent = await self.expiration_service.check_and_notify_expiring_subscriptions()
            results["notifications_sent"] = notifications_sent
            
            print(f"[{timestamp}] [SCHEDULER] Tasks completed: {expired_count} expired, {notifications_sent} notifications")
            
        except Exception as e:
            print(f"[{timestamp}] [SCHEDULER] [ERROR] Daily tasks failed: {str(e)}")
            results["error"] = str(e)

        return results

    async def run_weekly_tasks(self) -> dict:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [SCHEDULER] Running weekly subscription tasks")
        
        results = {
            "summary_generated": True,
            "executed_at": timestamp
        }

        try:
            # Generar resumen semanal de expiraciones
            summary = await self.expiration_service.get_expiration_summary()
            results["expiration_summary"] = summary
            
            print(f"[{timestamp}] [SCHEDULER] Weekly summary: {summary}")
            
        except Exception as e:
            print(f"[{timestamp}] [SCHEDULER] [ERROR] Weekly tasks failed: {str(e)}")
            results["error"] = str(e)

        return results

# Función para ejecutar manualmente (desde FastAPI)
async def execute_daily_tasks():
    scheduler = SubscriptionScheduler()
    return await scheduler.run_daily_tasks()

async def execute_weekly_tasks():
    scheduler = SubscriptionScheduler()
    return await scheduler.run_weekly_tasks()