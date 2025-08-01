from pydantic import BaseModel, validator
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any

class CreateCheckoutRequest(BaseModel):
    plan_type: str
    success_url: str
    cancel_url: str

    @validator('plan_type')
    def validate_plan_type(cls, v):
        valid_plans = ["aventurero", "nomada_digital"]
        if v not in valid_plans:
            raise ValueError(f"Plan type must be one of: {valid_plans}")
        return v

class UpgradeSubscriptionRequest(BaseModel):
    new_plan_type: str
    success_url: str
    cancel_url: str

    @validator('new_plan_type')
    def validate_new_plan_type(cls, v):
        valid_plans = ["aventurero", "nomada_digital"]
        if v not in valid_plans:
            raise ValueError(f"New plan type must be one of: {valid_plans}")
        return v

class CancelSubscriptionRequest(BaseModel):
    cancel_immediately: bool = False
    reason: Optional[str] = None

class ReactivateSubscriptionRequest(BaseModel):
    success_url: str
    cancel_url: str

class ExtendTrialRequest(BaseModel):
    additional_days: int

    @validator('additional_days')
    def validate_additional_days(cls, v):
        if v < 1 or v > 30:
            raise ValueError("Additional days must be between 1 and 30")
        return v

class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str
    customer_id: str
    plan: Dict[str, Any]

class PlanInfoResponse(BaseModel):
    plan: str
    name: str
    subtitle: str
    price_mxn: Decimal
    price_usd: Decimal
    billing_interval: Optional[str]
    trial_days: int
    popular: bool
    features: List[str]
    limitations: List[str]
    limits: Dict[str, Any]

class TrialInfoResponse(BaseModel):
    active: bool
    trial_start: Optional[datetime]
    trial_end: Optional[datetime]
    days_remaining: Optional[int]

class BillingInfoResponse(BaseModel):
    current_period_start: Optional[datetime]
    current_period_end: Optional[datetime]
    cancel_at_period_end: bool
    next_payment_date: Optional[datetime]

class SubscriptionStatusResponse(BaseModel):
    id: Optional[str]
    plan_type: str
    plan_name: str
    status: str
    price_mxn: Decimal
    limits: Dict[str, Any]
    features_available: Dict[str, bool]
    trial: Optional[TrialInfoResponse]
    billing: Optional[BillingInfoResponse]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

class UsageStatsResponse(BaseModel):
    active_trips: int
    max_trips: int
    trips_percentage: Optional[float]
    total_photos: int
    largest_group_size: int
    last_updated: datetime

class UsageAnalyticsResponse(BaseModel):
    trips_created_last_30_days: int
    average_photos_per_trip: float
    average_expenses_per_trip: float
    most_active_period: str
    usage_trend: str

class RecommendationResponse(BaseModel):
    type: str
    priority: str
    title: str
    message: str
    action: str

class SubscriptionUsageResponse(BaseModel):
    subscription: SubscriptionStatusResponse
    current_usage: UsageStatsResponse
    usage_analytics: UsageAnalyticsResponse
    recommendations: List[RecommendationResponse]

class PaymentIssueResponse(BaseModel):
    status: str
    message: str
    retry_url: Optional[str]
    next_attempt_date: Optional[datetime]

class SubscriptionFullResponse(BaseModel):
    subscription: SubscriptionStatusResponse
    payment_issue: Optional[PaymentIssueResponse]
    usage_summary: Optional[Dict[str, Any]]

class PlansListResponse(BaseModel):
    plans: List[PlanInfoResponse]
    current_plan: Optional[str]
    upgrade_available: bool

class CancelSubscriptionResponse(BaseModel):
    success: bool
    message: str
    access_until: Optional[datetime]
    downgrade_date: Optional[datetime]

class ReactivateSubscriptionResponse(BaseModel):
    success: bool
    message: Optional[str]
    checkout_url: Optional[str]
    immediate_access: bool

class UpgradeResponse(BaseModel):
    success: bool
    checkout_url: Optional[str]
    upgrade_info: Optional[Dict[str, Any]]
    immediate_access: bool

class WebhookResponse(BaseModel):
    received: bool
    event_id: str
    processed: bool

class SubscriptionError(BaseModel):
    error: str
    code: str
    message: str
    details: Optional[Dict[str, Any]]

class LimitCheckResponse(BaseModel):
    allowed: bool
    limit_type: Optional[str]
    current_usage: Optional[int]
    max_allowed: Optional[int]
    message: Optional[str]
    upgrade_required: bool
    upgrade_options: Optional[Dict[str, Any]]

class FeatureAccessResponse(BaseModel):
    feature: str
    available: bool
    reason: Optional[str]
    upgrade_required: bool
    recommended_plan: Optional[str]

class TrialStatisticsResponse(BaseModel):
    active_trials: int
    expiring_within_7_days: int
    past_due_subscriptions: int
    expired_subscriptions: int
    generated_at: datetime

class EmailStatisticsResponse(BaseModel):
    period_days: int
    total_emails: int
    success_rate: float
    by_template: Dict[str, Dict[str, Any]]
    generated_at: datetime

class HealthCheckResponse(BaseModel):
    status: str
    service: str
    timestamp: datetime
    subscription_service_healthy: bool
    stripe_connected: bool