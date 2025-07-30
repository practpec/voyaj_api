from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from src.shared.config import settings
from src.shared.infrastructure.database.mongo_client import connect_to_mongo, close_mongo_connection
from src.auth.infrastructure.http.auth_router import router as auth_router
from src.trips.infrastructure.http.trips_router import router as trips_router
from src.expenses.infrastructure.http.expenses_router import router as expenses_router
from src.photos.infrastructure.http.photos_router import router as photos_router
from src.journal_entries.infrastructure.http.journal_entries_router import router as journal_entries_router
from src.friendships.infrastructure.http.friendships_router import router as friendships_router
from src.plan_deviations.infrastructure.http.plan_deviations_router import router as plan_deviations_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()

app = FastAPI(
    title="Voyaj API",
    description="Travel management platform with collaborative features",
    version=settings.app_version,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(trips_router)
app.include_router(expenses_router)
app.include_router(photos_router)
app.include_router(journal_entries_router)
app.include_router(friendships_router)
app.include_router(plan_deviations_router)

@app.get("/")
async def root():
    return {"message": "Voyaj API is running", "version": settings.app_version}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "environment": settings.environment}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)