import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.shared.config import settings
from src.shared.infrastructure.database.mongo_client import connect_to_mongo, close_mongo_connection
from src.shared.infrastructure.security.verification_middleware import EmailVerificationMiddleware
from src.shared.infrastructure.middleware.subscription_middleware import SubscriptionMiddleware
from src.shared.infrastructure.middleware.security_middleware import SecurityMiddleware
from src.auth.infrastructure.http.auth_router import router as auth_router
from src.trips.infrastructure.http.trips_router import router as trips_router
from src.expenses.infrastructure.http.expenses_router import router as expenses_router
from src.photos.infrastructure.http.photos_router import router as photos_router
from src.journal_entries.infrastructure.http.journal_entries_router import router as journal_entries_router
from src.friendships.infrastructure.http.friendships_router import router as friendships_router
from src.subscriptions.infrastructure.http.subscription_router import router as subscription_router
from src.subscriptions.application.subscription_scheduler import execute_daily_tasks, execute_weekly_tasks

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(
    title="Voyaj API",
    description="Tu plataforma de aventuras con suscripciones FREE y PRO",
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs" if settings.environment == "development" else "/api/docs",
    redoc_url="/redoc" if settings.environment == "development" else "/api/redoc"
)

origins = settings.allowed_origins.split(",") if settings.allowed_origins else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SecurityMiddleware)
app.add_middleware(SubscriptionMiddleware)
app.add_middleware(EmailVerificationMiddleware)

app.include_router(auth_router)
app.include_router(subscription_router)
app.include_router(trips_router)
app.include_router(expenses_router)
app.include_router(photos_router)
app.include_router(journal_entries_router)
app.include_router(friendships_router)

@app.post("/admin/run-daily-tasks")
async def run_daily_tasks():
    return await execute_daily_tasks()

@app.post("/admin/run-weekly-tasks")
async def run_weekly_tasks():
    return await execute_weekly_tasks()

@app.get("/")
async def root():
    return {
        "message": "La API Voyaj está en funcionamiento", 
        "version": settings.app_version,
        "environment": settings.environment,
        "features": {
            "subscriptions": "FREE & PRO",
            "payment_provider": "MercadoPago",
            "plans": {
                "FREE": "1 viaje, funciones básicas",
                "PRO": "Viajes ilimitados, $24.99 MXN/mes"
            },
            "new_features": [
                "Payment history tracking",
                "Expiration notifications (7 days)",
                "Automated subscription management"
            ]
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "environment": settings.environment,
        "port": os.getenv("PORT", "8000"),
        "services": {
            "database": "connected",
            "subscriptions": "active",
            "email": "active",
            "mercadopago": "connected",
            "scheduler": "active"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)