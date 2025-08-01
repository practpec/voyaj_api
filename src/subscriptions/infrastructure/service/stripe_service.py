import stripe
from datetime import datetime
from typing import Optional, Dict, Any
from src.shared.config import settings

class StripeService:
    def __init__(self):
        stripe.api_key = getattr(settings, 'stripe_secret_key', None)
        self.webhook_secret = getattr(settings, 'stripe_webhook_secret', None)
        
        if not stripe.api_key:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [STRIPE_SERVICE] [ERROR] Stripe API key not configured")

    async def create_customer(self, email: str, name: str, user_id: str) -> Optional[str]:
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata={
                    'user_id': user_id,
                    'source': 'voyaj_api'
                }
            )
            return customer.id
        except stripe.error.StripeError as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [STRIPE_SERVICE] [ERROR] Failed to create customer: {str(e)}")
            return None

    async def create_checkout_session(
        self,
        customer_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        user_id: str,
        plan_type: str,
        trial_period_days: int = 0
    ) -> Optional[Dict[str, Any]]:
        try:
            session_params = {
                'customer': customer_id,
                'payment_method_types': ['card'],
                'line_items': [{
                    'price': price_id,
                    'quantity': 1,
                }],
                'mode': 'subscription',
                'success_url': success_url,
                'cancel_url': cancel_url,
                'metadata': {
                    'user_id': user_id,
                    'plan_type': plan_type
                },
                'subscription_data': {
                    'metadata': {
                        'user_id': user_id,
                        'plan_type': plan_type
                    }
                }
            }

            if trial_period_days > 0:
                session_params['subscription_data']['trial_period_days'] = trial_period_days

            session = stripe.checkout.Session.create(**session_params)
            
            return {
                'session_id': session.id,
                'url': session.url,
                'customer_id': customer_id
            }
        except stripe.error.StripeError as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [STRIPE_SERVICE] [ERROR] Failed to create checkout session: {str(e)}")
            return None

    async def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        trial_period_days: int = 0,
        metadata: Dict[str, str] = None
    ) -> Optional[Dict[str, Any]]:
        try:
            subscription_params = {
                'customer': customer_id,
                'items': [{
                    'price': price_id,
                }],
                'metadata': metadata or {}
            }

            if trial_period_days > 0:
                subscription_params['trial_period_days'] = trial_period_days

            subscription = stripe.Subscription.create(**subscription_params)
            
            return {
                'subscription_id': subscription.id,
                'status': subscription.status,
                'current_period_start': datetime.fromtimestamp(subscription.current_period_start),
                'current_period_end': datetime.fromtimestamp(subscription.current_period_end),
                'trial_start': datetime.fromtimestamp(subscription.trial_start) if subscription.trial_start else None,
                'trial_end': datetime.fromtimestamp(subscription.trial_end) if subscription.trial_end else None
            }
        except stripe.error.StripeError as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [STRIPE_SERVICE] [ERROR] Failed to create subscription: {str(e)}")
            return None

    async def cancel_subscription(self, subscription_id: str, at_period_end: bool = True) -> Optional[Dict[str, Any]]:
        try:
            if at_period_end:
                subscription = stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
            else:
                subscription = stripe.Subscription.delete(subscription_id)
            
            return {
                'subscription_id': subscription.id,
                'status': subscription.status,
                'canceled_at': datetime.fromtimestamp(subscription.canceled_at) if subscription.canceled_at else None,
                'cancel_at_period_end': subscription.cancel_at_period_end,
                'current_period_end': datetime.fromtimestamp(subscription.current_period_end)
            }
        except stripe.error.StripeError as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [STRIPE_SERVICE] [ERROR] Failed to cancel subscription: {str(e)}")
            return None

    async def update_subscription(
        self,
        subscription_id: str,
        new_price_id: str,
        proration_behavior: str = "create_prorations"
    ) -> Optional[Dict[str, Any]]:
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            
            stripe.Subscription.modify(
                subscription_id,
                items=[{
                    'id': subscription['items']['data'][0].id,
                    'price': new_price_id,
                }],
                proration_behavior=proration_behavior
            )
            
            updated_subscription = stripe.Subscription.retrieve(subscription_id)
            
            return {
                'subscription_id': updated_subscription.id,
                'status': updated_subscription.status,
                'current_period_start': datetime.fromtimestamp(updated_subscription.current_period_start),
                'current_period_end': datetime.fromtimestamp(updated_subscription.current_period_end)
            }
        except stripe.error.StripeError as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [STRIPE_SERVICE] [ERROR] Failed to update subscription: {str(e)}")
            return None

    async def reactivate_subscription(self, subscription_id: str) -> Optional[Dict[str, Any]]:
        try:
            subscription = stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=False
            )
            
            return {
                'subscription_id': subscription.id,
                'status': subscription.status,
                'cancel_at_period_end': subscription.cancel_at_period_end
            }
        except stripe.error.StripeError as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [STRIPE_SERVICE] [ERROR] Failed to reactivate subscription: {str(e)}")
            return None

    async def get_subscription(self, subscription_id: str) -> Optional[Dict[str, Any]]:
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            
            return {
                'subscription_id': subscription.id,
                'customer_id': subscription.customer,
                'status': subscription.status,
                'current_period_start': datetime.fromtimestamp(subscription.current_period_start),
                'current_period_end': datetime.fromtimestamp(subscription.current_period_end),
                'cancel_at_period_end': subscription.cancel_at_period_end,
                'canceled_at': datetime.fromtimestamp(subscription.canceled_at) if subscription.canceled_at else None,
                'trial_start': datetime.fromtimestamp(subscription.trial_start) if subscription.trial_start else None,
                'trial_end': datetime.fromtimestamp(subscription.trial_end) if subscription.trial_end else None,
                'metadata': subscription.metadata
            }
        except stripe.error.StripeError as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [STRIPE_SERVICE] [ERROR] Failed to get subscription: {str(e)}")
            return None

    async def get_customer(self, customer_id: str) -> Optional[Dict[str, Any]]:
        try:
            customer = stripe.Customer.retrieve(customer_id)
            
            return {
                'customer_id': customer.id,
                'email': customer.email,
                'name': customer.name,
                'metadata': customer.metadata
            }
        except stripe.error.StripeError as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [STRIPE_SERVICE] [ERROR] Failed to get customer: {str(e)}")
            return None

    def verify_webhook_signature(self, payload: bytes, signature: str) -> Optional[Dict[str, Any]]:
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, self.webhook_secret
            )
            return event
        except ValueError:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [STRIPE_SERVICE] [ERROR] Invalid webhook payload")
            return None
        except stripe.error.SignatureVerificationError:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [STRIPE_SERVICE] [ERROR] Invalid webhook signature")
            return None

    async def create_billing_portal_session(self, customer_id: str, return_url: str) -> Optional[str]:
        try:
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url,
            )
            return session.url
        except stripe.error.StripeError as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [STRIPE_SERVICE] [ERROR] Failed to create billing portal session: {str(e)}")
            return None

    async def get_upcoming_invoice(self, customer_id: str) -> Optional[Dict[str, Any]]:
        try:
            invoice = stripe.Invoice.upcoming(customer=customer_id)
            
            return {
                'amount_due': invoice.amount_due / 100,
                'currency': invoice.currency.upper(),
                'period_start': datetime.fromtimestamp(invoice.period_start),
                'period_end': datetime.fromtimestamp(invoice.period_end),
                'next_payment_attempt': datetime.fromtimestamp(invoice.next_payment_attempt) if invoice.next_payment_attempt else None
            }
        except stripe.error.StripeError as e:
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"[{timestamp}] [STRIPE_SERVICE] [ERROR] Failed to get upcoming invoice: {str(e)}")
            return None