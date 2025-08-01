from datetime import datetime, timedelta
from typing import Optional
from pydantic import BaseModel
from bson import ObjectId

class PlanType:
    FREE = "free"
    PRO = "pro"

class Subscription(BaseModel):
    id: Optional[str] = None
    user_id: str
    plan_type: str = PlanType.FREE
    status: str = "active"
    mercadopago_payment_id: Optional[str] = None
    expires_at: Optional[datetime] = None
    created_at: datetime = datetime.utcnow()
    updated_at: datetime = datetime.utcnow()

    class Config:
        json_encoders = {
            ObjectId: str
        }
        # Permitir valores por defecto en la construcción
        validate_assignment = True

    class Config:
        json_encoders = {
            ObjectId: str
        }

    def is_pro(self) -> bool:
        return self.plan_type == PlanType.PRO and self.status == "active"

    def is_expired(self) -> bool:
        return (self.expires_at and 
                self.expires_at <= datetime.utcnow() and 
                self.plan_type == PlanType.PRO)

    def activate_pro(self, payment_id: str) -> None:
        self.plan_type = PlanType.PRO
        self.status = "active"
        self.mercadopago_payment_id = payment_id
        self.expires_at = datetime.utcnow() + timedelta(days=30)
        self.updated_at = datetime.utcnow()

    def cancel_to_free(self) -> None:
        self.plan_type = PlanType.FREE
        self.status = "active"
        self.mercadopago_payment_id = None
        self.expires_at = None
        self.updated_at = datetime.utcnow()

    def expire_to_free(self) -> None:
        self.plan_type = PlanType.FREE
        self.status = "expired"
        self.updated_at = datetime.utcnow()