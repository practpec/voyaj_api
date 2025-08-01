from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from bson import ObjectId

class Subscription(BaseModel):
    id: Optional[str] = None
    user_id: str
    plan_type: str
    status: str
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    current_period_start: Optional[datetime] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: Optional[bool] = False
    trial_start: Optional[datetime] = None
    trial_end: Optional[datetime] = None
    trial_warning_sent: Optional[bool] = False
    trial_warning_sent_at: Optional[datetime] = None
    downgrade_reason: Optional[str] = None
    downgraded_at: Optional[datetime] = None
    last_upgrade_at: Optional[datetime] = None
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()

    class Config:
        json_encoders = {
            ObjectId: str
        }