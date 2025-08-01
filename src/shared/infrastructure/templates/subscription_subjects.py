class SubscriptionSubjects:
    
    def __init__(self):
         self.subjects = {
            "verification": "Verifica tu cuenta en Voyaj",
            "password_reset": "Restablece tu contraseña en Voyaj",
            "trip_invitation": "Te han invitado a un viaje en Voyaj",
            "welcome_free": "¡Bienvenido a Voyaj! Tu plan Explorador está listo",
            "welcome_premium": "¡Bienvenido a Voyaj Premium! Tu período de prueba ha comenzado",
            "payment_pending": "Completa tu suscripción a Voyaj - Período de prueba activo",
            "payment_successful": "¡Pago confirmado! Tu suscripción Voyaj está activa",
            "payment_failed": "Problema con tu pago - Actualiza tu método de pago",
            "subscription_renewed": "Tu suscripción Voyaj se ha renovado exitosamente",
            "upgrade_confirmation": "¡Upgrade confirmado! Disfruta tu nuevo plan Voyaj",
            "downgrade_warning": "Cambio de plan programado - Voyaj",
            "cancellation_confirmation": "Suscripción cancelada - Gracias por usar Voyaj",
            "limit_reached": "Límite alcanzado - Actualiza tu plan Voyaj",
            "trial_ending": "Tu período de prueba Voyaj termina en 3 días",
            "subscription_expired": "Tu suscripción Voyaj ha expirado"
        }
    
    def get_subject(self, template_type: str) -> str:
        subject = self.subjects.get(template_type)
        if not subject:
            raise ValueError(f"Subject for template type '{template_type}' not found")
        return subject

    def get_all_subjects(self) -> dict:
        return self.subjects.copy()

    def add_custom_subject(self, template_type: str, subject: str) -> None:
        self.subjects[template_type] = subject