# Archivos a Eliminar de la Carpeta Subscriptions

## Domain
- `src/subscriptions/domain/subscription_events.py` - Eventos específicos de Stripe
- `src/subscriptions/domain/subscription_plan.py` - Complejidad innecesaria con múltiples planes

## Application  
- `src/subscriptions/application/check_subscription_limits.py` - Lógica compleja de límites
- `src/subscriptions/application/create_checkout_session.py` - Específico de Stripe
- `src/subscriptions/application/handle_trial_expiration.py` - Lógica de trials complejos
- `src/subscriptions/application/process_stripe_event.py` - Procesamiento Stripe
- `src/subscriptions/application/send_subscription_emails.py` - Demasiados emails
- `src/subscriptions/application/update_subscription_status.py` - Complejidad innecesaria
- `src/subscriptions/application/upgrade_subscription.py` - Múltiples upgrades
- `src/subscriptions/application/get_subscription_usage.py` - Analytics complejos
- `src/subscriptions/application/validate_feature_access.py` - Validaciones complejas
- `src/subscriptions/application/cancel_subscription.py` - Lo reemplazamos

## Infrastructure
- `src/subscriptions/infrastructure/http/stripe_webhook_handler.py` - Webhooks Stripe
- `src/subscriptions/infrastructure/http/subscription_schemas.py` - Schemas complejos
- `src/subscriptions/infrastructure/http/subscription_router.py` - Router complejo

## Templates
- `src/shared/infrastructure/templates/subscription_templates.py` - Demasiados templates
- `src/shared/infrastructure/templates/subscription_subjects.py` - Múltiples subjects

## Services
- `src/shared/infrastructure/services/stripe_service.py` - Servicio Stripe completo

## Middleware
- `src/shared/infrastructure/middleware/subscription_limits_middleware.py` - Muy complejo

## Total: 16 archivos eliminados
## Mantenemos solo:
- `src/subscriptions/domain/subscription.py` (simplificado)
- `src/subscriptions/infrastructure/persistence/mongo_subscription_repository.py` (simplificado)
- `src/subscriptions/application/create_subscription.py` (simplificado)

## Próximo paso: Plan simplificado con MercadoPago