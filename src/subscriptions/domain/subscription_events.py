from enum import Enum
from typing import Dict, Callable, Any

class StripeEventType(str, Enum):
    CHECKOUT_SESSION_COMPLETED = "checkout.session.completed"
    CUSTOMER_SUBSCRIPTION_CREATED = "customer.subscription.created"
    CUSTOMER_SUBSCRIPTION_UPDATED = "customer.subscription.updated"
    CUSTOMER_SUBSCRIPTION_DELETED = "customer.subscription.deleted"
    INVOICE_PAYMENT_SUCCEEDED = "invoice.payment_succeeded"
    INVOICE_PAYMENT_FAILED = "invoice.payment_failed"
    INVOICE_PAYMENT_ACTION_REQUIRED = "invoice.payment_action_required"
    CUSTOMER_SUBSCRIPTION_TRIAL_WILL_END = "customer.subscription.trial_will_end"

class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    TRIALING = "trialing"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    UNPAID = "unpaid"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    PAUSED = "paused"
    EXPIRED = "expired"
    PENDING = "pending"

class SubscriptionAction(str, Enum):
    ACTIVATE_SUBSCRIPTION = "activate_subscription"
    UPDATE_SUBSCRIPTION = "update_subscription"
    CANCEL_SUBSCRIPTION = "cancel_subscription"
    MARK_PAST_DUE = "mark_past_due"
    MARK_UNPAID = "mark_unpaid"
    SEND_PAYMENT_SUCCESS_EMAIL = "send_payment_success_email"
    SEND_PAYMENT_FAILED_EMAIL = "send_payment_failed_email"
    SEND_TRIAL_ENDING_EMAIL = "send_trial_ending_email"
    SEND_SUBSCRIPTION_CANCELLED_EMAIL = "send_subscription_cancelled_email"
    NO_ACTION = "no_action"

EVENT_ACTION_MAPPING: Dict[StripeEventType, SubscriptionAction] = {
    StripeEventType.CHECKOUT_SESSION_COMPLETED: SubscriptionAction.ACTIVATE_SUBSCRIPTION,
    StripeEventType.CUSTOMER_SUBSCRIPTION_CREATED: SubscriptionAction.UPDATE_SUBSCRIPTION,
    StripeEventType.CUSTOMER_SUBSCRIPTION_UPDATED: SubscriptionAction.UPDATE_SUBSCRIPTION,
    StripeEventType.CUSTOMER_SUBSCRIPTION_DELETED: SubscriptionAction.CANCEL_SUBSCRIPTION,
    StripeEventType.INVOICE_PAYMENT_SUCCEEDED: SubscriptionAction.SEND_PAYMENT_SUCCESS_EMAIL,
    StripeEventType.INVOICE_PAYMENT_FAILED: SubscriptionAction.SEND_PAYMENT_FAILED_EMAIL,
    StripeEventType.INVOICE_PAYMENT_ACTION_REQUIRED: SubscriptionAction.MARK_PAST_DUE,
    StripeEventType.CUSTOMER_SUBSCRIPTION_TRIAL_WILL_END: SubscriptionAction.SEND_TRIAL_ENDING_EMAIL
}

def get_action_for_event(event_type: str) -> SubscriptionAction:
    try:
        stripe_event = StripeEventType(event_type)
        return EVENT_ACTION_MAPPING.get(stripe_event, SubscriptionAction.NO_ACTION)
    except ValueError:
        return SubscriptionAction.NO_ACTION

def is_critical_event(event_type: str) -> bool:
    critical_events = {
        StripeEventType.CHECKOUT_SESSION_COMPLETED,
        StripeEventType.CUSTOMER_SUBSCRIPTION_DELETED,
        StripeEventType.INVOICE_PAYMENT_FAILED
    }
    try:
        stripe_event = StripeEventType(event_type)
        return stripe_event in critical_events
    except ValueError:
        return False

def requires_immediate_action(event_type: str) -> bool:
    immediate_action_events = {
        StripeEventType.CHECKOUT_SESSION_COMPLETED,
        StripeEventType.INVOICE_PAYMENT_SUCCEEDED,
        StripeEventType.INVOICE_PAYMENT_FAILED,
        StripeEventType.CUSTOMER_SUBSCRIPTION_DELETED
    }
    try:
        stripe_event = StripeEventType(event_type)
        return stripe_event in immediate_action_events
    except ValueError:
        return False

def get_status_from_stripe_status(stripe_status: str) -> SubscriptionStatus:
    status_mapping = {
        "active": SubscriptionStatus.ACTIVE,
        "trialing": SubscriptionStatus.TRIALING,
        "past_due": SubscriptionStatus.PAST_DUE,
        "canceled": SubscriptionStatus.CANCELLED,
        "cancelled": SubscriptionStatus.CANCELLED,
        "unpaid": SubscriptionStatus.UNPAID,
        "incomplete": SubscriptionStatus.INCOMPLETE,
        "incomplete_expired": SubscriptionStatus.INCOMPLETE_EXPIRED,
        "paused": SubscriptionStatus.PAUSED
    }
    return status_mapping.get(stripe_status, SubscriptionStatus.EXPIRED)

def should_send_email(action: SubscriptionAction) -> bool:
    email_actions = {
        SubscriptionAction.SEND_PAYMENT_SUCCESS_EMAIL,
        SubscriptionAction.SEND_PAYMENT_FAILED_EMAIL,
        SubscriptionAction.SEND_TRIAL_ENDING_EMAIL,
        SubscriptionAction.SEND_SUBSCRIPTION_CANCELLED_EMAIL
    }
    return action in email_actions

def get_email_template_for_action(action: SubscriptionAction) -> str:
    template_mapping = {
        SubscriptionAction.SEND_PAYMENT_SUCCESS_EMAIL: "payment_successful",
        SubscriptionAction.SEND_PAYMENT_FAILED_EMAIL: "payment_failed",
        SubscriptionAction.SEND_TRIAL_ENDING_EMAIL: "trial_ending",
        SubscriptionAction.SEND_SUBSCRIPTION_CANCELLED_EMAIL: "cancellation_confirmation"
    }
    return template_mapping.get(action, "")

class EventPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

def get_event_priority(event_type: str) -> EventPriority:
    high_priority = {
        StripeEventType.INVOICE_PAYMENT_FAILED,
        StripeEventType.CUSTOMER_SUBSCRIPTION_DELETED
    }
    medium_priority = {
        StripeEventType.CHECKOUT_SESSION_COMPLETED,
        StripeEventType.INVOICE_PAYMENT_SUCCEEDED,
        StripeEventType.CUSTOMER_SUBSCRIPTION_TRIAL_WILL_END
    }
    
    try:
        stripe_event = StripeEventType(event_type)
        if stripe_event in high_priority:
            return EventPriority.HIGH
        elif stripe_event in medium_priority:
            return EventPriority.MEDIUM
        else:
            return EventPriority.LOW
    except ValueError:
        return EventPriority.LOW