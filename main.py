from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.shared.config import settings
from src.shared.infrastructure.database.mongo_client import connect_to_mongo, close_mongo_connection
from src.shared.infrastructure.security.verification_middleware import EmailVerificationMiddleware
from src.shared.infrastructure.middleware.subscription_middleware import SubscriptionMiddleware
from src.auth.infrastructure.http.auth_router import router as auth_router
from src.trips.infrastructure.http.trips_router import router as trips_router
from src.expenses.infrastructure.http.expenses_router import router as expenses_router
from src.photos.infrastructure.http.photos_router import router as photos_router
from src.journal_entries.infrastructure.http.journal_entries_router import router as journal_entries_router
from src.friendships.infrastructure.http.friendships_router import router as friendships_router
from src.subscriptions.infrastructure.http.subscription_router import router as subscription_router

app = FastAPI(
    title="Voyaj API",
    description="Tu plataforma de aventuras con suscripciones FREE y PRO",
    version=settings.app_version
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SubscriptionMiddleware)
app.add_middleware(EmailVerificationMiddleware)

@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()

@app.on_event("shutdown") 
async def shutdown_event():
    await close_mongo_connection()

app.include_router(auth_router)
app.include_router(subscription_router)
app.include_router(trips_router)
app.include_router(expenses_router)
app.include_router(photos_router)
app.include_router(journal_entries_router)
app.include_router(friendships_router)

@app.get("/")
async def root():
    return {
        "message": "La API Voyaj está en funcionamiento", 
        "version": settings.app_version,
        "features": {
            "subscriptions": "FREE & PRO",
            "payment_provider": "MercadoPago",
            "plans": {
                "FREE": "1 viaje, funciones básicas",
                "PRO": "Viajes ilimitados, $9.99 MXN/mes"
            }
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "environment": settings.environment,
        "services": {
            "database": "connected",
            "subscriptions": "active",
            "email": "active",
            "mercadopago": "connected"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)