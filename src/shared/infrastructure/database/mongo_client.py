from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from src.shared.config import settings

class MongoDB:
    client: AsyncIOMotorClient = None
    database: AsyncIOMotorDatabase = None

mongodb = MongoDB()

async def connect_to_mongo():
    mongodb.client = AsyncIOMotorClient(settings.mongodb_url)
    mongodb.database = mongodb.client[settings.mongodb_database]

async def close_mongo_connection():
    if mongodb.client:
        mongodb.client.close()

def get_database() -> AsyncIOMotorDatabase:
    return mongodb.database