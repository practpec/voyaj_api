from fastapi import APIRouter, HTTPException, status, Depends, Request
from typing import List
from src.subscriptions.infrastructure.http.subscription_schemas import (
    CreateCheckoutRequest, CheckoutResponse,
    UpgradeSubscriptionRequest, UpgradeResponse,
    CancelSubscriptionRequest, CancelSubscriptionResponse,
    ReactivateSubscriptionRequest, ReactivateSubscriptionResponse,
    SubscriptionStatusResponse, SubscriptionUsageResponse,
    PlansListResponse, WebhookResponse
)
from src.subscriptions.application.create_checkout_session import CreateCheckoutSession
from src.subscriptions.application.upgrade_subscription import UpgradeSubscription
from src.subscriptions.application.cancel_subscription import CancelSubscription
from src.subscriptions.application.get_subscription_usage import GetSubscriptionUsage
from src.subscriptions.infrastructure.http.stripe_webhook_handler import StripeWebhookHandler
from src.subscriptions.domain.subscription_plan import get_all_plans, SubscriptionPlan
from src.shared.infrastructure.security.authentication import get_current_user_id

router = APIRouter(prefix="/subscriptions", tags=["subscriptions"])

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    request: CreateCheckoutRequest,
    user_id: str = Depends(get_current_user_id)
):
    try:
        checkout_service = CreateCheckoutSession()
        plan_type = SubscriptionPlan(request.plan_type)
        
        result = await checkout_service.execute(
            user_id=user_id,
            plan_type=plan_type,
            success_url=request.success_url,
            cancel_url=request.cancel_url
        )
        
        return CheckoutResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create checkout session")

@router.post("/upgrade", response_model=UpgradeResponse)
async def upgrade_subscription(
    request: UpgradeSubscriptionRequest,
    user_id: str = Depends(get_current_user_id)
):
    try:
        upgrade_service = UpgradeSubscription()
        new_plan_type = SubscriptionPlan(request.new_plan_type)
        
        result = await upgrade_service.execute(
            user_id=user_id,
            new_plan_type=new_plan_type
        )
        
        return UpgradeResponse(
            success=result["success"],
            checkout_url=None,
            upgrade_info=result.get("upgrade_details"),
            immediate_access=result["upgrade_details"]["effective_immediately"]
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to upgrade subscription")

@router.post("/cancel", response_model=CancelSubscriptionResponse)
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    user_id: str = Depends(get_current_user_id)
):
    try:
        cancel_service = CancelSubscription()
        result = await cancel_service.execute(
            user_id=user_id,
            cancel_immediately=request.cancel_immediately,
            reason=request.reason
        )
        
        return CancelSubscriptionResponse(
            success=True,
            message="Subscription cancelled successfully",
            access_until=result.get("access_until"),
            downgrade_date=result.get("downgrade_date")
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to cancel subscription")

@router.get("/status", response_model=SubscriptionStatusResponse)
async def get_subscription_status(user_id: str = Depends(get_current_user_id)):
    try:
        usage_service = GetSubscriptionUsage()
        result = await usage_service.execute(user_id)
        
        subscription_data = result["subscription"]
        plan_info = result["plan_info"]
        limits = result["limits"]
        billing_info = result.get("billing_info", {})
        
        trial_info = None
        if billing_info.get("trial_info"):
            trial_data = billing_info["trial_info"]
            trial_info = {
                "active": True,
                "trial_start": trial_data.get("trial_start"),
                "trial_end": trial_data.get("trial_end"),
                "days_remaining": trial_data.get("days_remaining")
            }
        
        billing_response = None
        if billing_info.get("current_period_start"):
            billing_response = {
                "current_period_start": billing_info.get("current_period_start"),
                "current_period_end": billing_info.get("current_period_end"),
                "cancel_at_period_end": billing_info.get("cancel_at_period_end", False),
                "next_payment_date": billing_info.get("current_period_end")
            }
        
        features_available = {}
        for feature, available in limits.items():
            if isinstance(available, bool):
                features_available[feature] = available
            elif isinstance(available, int):
                features_available[feature] = available != 0
        
        return SubscriptionStatusResponse(
            id=subscription_data.get("id"),
            plan_type=subscription_data["plan"],
            plan_name=plan_info["name"],
            status=subscription_data["status"],
            price_mxn=plan_info["price_mxn"],
            limits=limits,
            features_available=features_available,
            trial=trial_info,
            billing=billing_response,
            created_at=subscription_data.get("created_at"),
            updated_at=subscription_data.get("updated_at")
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get subscription status")

@router.get("/usage", response_model=SubscriptionUsageResponse)
async def get_subscription_usage(user_id: str = Depends(get_current_user_id)):
    try:
        usage_service = GetSubscriptionUsage()
        result = await usage_service.execute(user_id)
        
        subscription_data = result["subscription"]
        plan_info = result["plan_info"]
        current_usage = result["current_usage"]
        usage_analytics = result["usage_analytics"]
        recommendations = result["recommendations"]
        limits = result["limits"]
        
        usage_stats = {
            "active_trips": current_usage["active_trips"],
            "max_trips": limits.get("max_trips", -1),
            "trips_percentage": None,
            "total_photos": current_usage["total_photos"],
            "largest_group_size": current_usage["largest_group_size"],
            "last_updated": current_usage["last_updated"]
        }
        
        if limits.get("max_trips", -1) > 0:
            usage_stats["trips_percentage"] = (current_usage["active_trips"] / limits["max_trips"]) * 100
        
        return SubscriptionUsageResponse(
            subscription=SubscriptionStatusResponse(
                id=subscription_data.get("id"),
                plan_type=subscription_data["plan"],
                plan_name=plan_info["name"],
                status=subscription_data["status"],
                price_mxn=plan_info["price_mxn"],
                limits=limits,
                features_available={},
                trial=None,
                billing=None,
                created_at=subscription_data.get("created_at"),
                updated_at=subscription_data.get("updated_at")
            ),
            current_usage=usage_stats,
            usage_analytics=usage_analytics,
            recommendations=recommendations
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get usage data")

@router.post("/reactivate", response_model=ReactivateSubscriptionResponse)
async def reactivate_subscription(
    request: ReactivateSubscriptionRequest,
    user_id: str = Depends(get_current_user_id)
):
    try:
        checkout_service = CreateCheckoutSession()
        result = await checkout_service.create_reactivation_session(
            user_id=user_id,
            success_url=request.success_url,
            cancel_url=request.cancel_url
        )
        
        if "message" in result:
            return ReactivateSubscriptionResponse(
                success=True,
                message=result["message"],
                immediate_access=True
            )
        else:
            return ReactivateSubscriptionResponse(
                success=True,
                checkout_url=result["checkout_url"],
                immediate_access=result["reactivation_info"]["immediate_access"]
            )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to reactivate subscription")

@router.get("/plans", response_model=PlansListResponse)
async def get_available_plans(user_id: str = Depends(get_current_user_id)):
    try:
        all_plans = get_all_plans()
        
        usage_service = GetSubscriptionUsage()
        try:
            user_subscription = await usage_service.execute(user_id)
            current_plan = user_subscription["subscription"]["plan"]
        except:
            current_plan = "explorador"
        
        plans_response = []
        for plan_data in all_plans:
            plan_response = {
                "plan": plan_data["plan"],
                "name": plan_data["name"],
                "subtitle": plan_data["subtitle"],
                "price_mxn": plan_data["price_mxn"],
                "price_usd": plan_data["price_usd"],
                "billing_interval": plan_data["billing_interval"],
                "trial_days": plan_data["trial_days"],
                "popular": plan_data["popular"],
                "features": plan_data["features"],
                "limitations": plan_data["limitations"],
                "limits": plan_data["limits"]
            }
            plans_response.append(plan_response)
        
        upgrade_available = current_plan == "explorador"
        
        return PlansListResponse(
            plans=plans_response,
            current_plan=current_plan,
            upgrade_available=upgrade_available
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get plans")

@router.post("/webhooks/stripe", response_model=WebhookResponse)
async def handle_stripe_webhook(request: Request):
    webhook_handler = StripeWebhookHandler()
    result = await webhook_handler.handle_webhook(request)
    return WebhookResponse(
        received=result["received"],
        event_id=result["event_id"],
        processed=True
    )