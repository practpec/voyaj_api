from enum import Enum
from typing import Dict, List, Any
from decimal import Decimal

class SubscriptionPlan(str, Enum):
    EXPLORADOR = "explorador"
    AVENTURERO = "aventurero"
    NOMADA_DIGITAL = "nomada_digital"

class PlanLimits:
    EXPLORADOR = {
        "max_trips": 1,
        "max_photos_per_trip": 100,
        "max_group_members": 1,
        "collaborative_trips": False,
        "premium_export": False,
        "advanced_analytics": False,
        "priority_support": False,
        "unlimited_devices": False,
        "auto_backup": False,
        "expense_categories": False
    }
    
    AVENTURERO = {
        "max_trips": -1,
        "max_photos_per_trip": -1,
        "max_group_members": 10,
        "collaborative_trips": True,
        "premium_export": True,
        "advanced_analytics": True,
        "priority_support": True,
        "unlimited_devices": False,
        "auto_backup": False,
        "expense_categories": True
    }
    
    NOMADA_DIGITAL = {
        "max_trips": -1,
        "max_photos_per_trip": -1,
        "max_group_members": -1,
        "collaborative_trips": True,
        "premium_export": True,
        "advanced_analytics": True,
        "priority_support": True,
        "unlimited_devices": True,
        "auto_backup": True,
        "expense_categories": True
    }

class PlanPricing:
    PLANS = {
        SubscriptionPlan.EXPLORADOR: {
            "name": "Explorador",
            "subtitle": "Perfecto para empezar",
            "price_mxn": Decimal("0.00"),
            "price_usd": Decimal("0.00"),
            "stripe_price_id": None,
            "billing_interval": None,
            "trial_days": 0,
            "popular": False,
            "features": [
                "1 viaje activo",
                "Planificación básica",
                "Control de gastos",
                "100 fotos por viaje",
                "Diario personal",
                "Soporte por email"
            ],
            "limitations": [
                "Sin viajes colaborativos",
                "Sin exportación premium",
                "Sin análisis avanzados"
            ]
        },
        SubscriptionPlan.AVENTURERO: {
            "name": "Aventurero",
            "subtitle": "Para viajeros frecuentes",
            "price_mxn": Decimal("9.99"),
            "price_usd": Decimal("0.53"),
            "stripe_price_id": "price_aventurero_monthly",
            "billing_interval": "month",
            "trial_days": 7,
            "popular": True,
            "features": [
                "Viajes ilimitados",
                "Planificación avanzada",
                "Control de gastos completo",
                "Fotos ilimitadas",
                "Diario colaborativo",
                "Viajes en grupo (hasta 10 personas)",
                "Análisis de patrones de gasto",
                "Exportación PDF/Excel",
                "Soporte prioritario 24/7"
            ],
            "limitations": []
        },
        SubscriptionPlan.NOMADA_DIGITAL: {
            "name": "Nómada Digital",
            "subtitle": "Para viajeros profesionales",
            "price_mxn": Decimal("19.99"),
            "price_usd": Decimal("1.06"),
            "stripe_price_id": "price_nomada_monthly",
            "billing_interval": "month",
            "trial_days": 7,
            "popular": False,
            "features": [
                "Todo lo de Aventurero",
                "Viajes en grupo ilimitado",
                "Almacenamiento de fotos ilimitado",
                "Exportación avanzada",
                "Análisis de gastos por categorías",
                "Historial completo de viajes",
                "Copias de seguridad automáticas",
                "Acceso prioritario a nuevas funciones",
                "Soporte prioritario 24/7",
                "Sin límite de dispositivos"
            ],
            "limitations": []
        }
    }

def get_plan_limits(plan: SubscriptionPlan) -> Dict[str, Any]:
    limits_map = {
        SubscriptionPlan.EXPLORADOR: PlanLimits.EXPLORADOR,
        SubscriptionPlan.AVENTURERO: PlanLimits.AVENTURERO,
        SubscriptionPlan.NOMADA_DIGITAL: PlanLimits.NOMADA_DIGITAL
    }
    return limits_map.get(plan, PlanLimits.EXPLORADOR)

def get_plan_info(plan: SubscriptionPlan) -> Dict[str, Any]:
    return PlanPricing.PLANS.get(plan, PlanPricing.PLANS[SubscriptionPlan.EXPLORADOR])

def is_feature_available(plan: SubscriptionPlan, feature: str) -> bool:
    limits = get_plan_limits(plan)
    return limits.get(feature, False)

def get_numeric_limit(plan: SubscriptionPlan, limit_type: str) -> int:
    limits = get_plan_limits(plan)
    return limits.get(limit_type, 0)

def is_premium_plan(plan: SubscriptionPlan) -> bool:
    return plan in [SubscriptionPlan.AVENTURERO, SubscriptionPlan.NOMADA_DIGITAL]

def get_stripe_price_id(plan: SubscriptionPlan) -> str:
    plan_info = get_plan_info(plan)
    return plan_info.get("stripe_price_id")

def get_all_plans() -> List[Dict[str, Any]]:
    return [
        {
            "plan": plan.value,
            **get_plan_info(plan),
            "limits": get_plan_limits(plan)
        }
        for plan in SubscriptionPlan
    ]