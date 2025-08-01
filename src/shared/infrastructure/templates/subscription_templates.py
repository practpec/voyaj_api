from typing import Dict, Any

class SubscriptionTemplates:
    
    def get_template(self, template_type: str, data: Dict[str, Any]) -> str:
        templates = {
            "welcome_free": self._welcome_free_template,
            "welcome_premium": self._welcome_premium_template,
            "payment_pending": self._payment_pending_template,
            "payment_successful": self._payment_successful_template,
            "payment_failed": self._payment_failed_template,
            "subscription_renewed": self._subscription_renewed_template,
            "upgrade_confirmation": self._upgrade_confirmation_template,
            "downgrade_warning": self._downgrade_warning_template,
            "cancellation_confirmation": self._cancellation_confirmation_template,
            "limit_reached": self._limit_reached_template,
            "trial_ending": self._trial_ending_template,
            "subscription_expired": self._subscription_expired_template
        }
        
        template_func = templates.get(template_type)
        if not template_func:
            raise ValueError(f"Template type '{template_type}' not found")
        
        return template_func(data)

    def _welcome_free_template(self, data: Dict[str, Any]) -> str:
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Bienvenido a Voyaj - Plan Explorador</title>
</head>
<body>
    <h1>¡Bienvenido a Voyaj, {data.get('user_name', 'Explorador')}!</h1>
    
    <p>Tu cuenta gratuita está lista. Con el plan Explorador puedes:</p>
    
    <ul>
        <li>Crear 1 viaje activo</li>
        <li>Subir hasta 100 fotos por viaje</li>
        <li>Control básico de gastos</li>
        <li>Diario personal</li>
        <li>Soporte por email</li>
    </ul>
    
    <p>¿Quieres más funciones? Actualiza a un plan premium para viajes ilimitados, colaboración con amigos y muchas funciones más.</p>
    
    <p>¡Comienza tu aventura ahora!</p>
    
    <p>Saludos,<br>El equipo de Voyaj</p>
</body>
</html>
"""

    def _welcome_premium_template(self, data: Dict[str, Any]) -> str:
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Bienvenido a Voyaj - Plan {data.get('plan_name', 'Premium')}</title>
</head>
<body>
    <h1>¡Bienvenido a Voyaj Premium, {data.get('user_name', 'Viajero')}!</h1>
    
    <p>Has seleccionado el plan {data.get('plan_name', 'Premium')}. Tu período de prueba gratuito de 7 días ha comenzado.</p>
    
    <p>Con tu plan premium tendrás acceso a:</p>
    
    <ul>
        <li>Viajes ilimitados</li>
        <li>Fotos ilimitadas</li>
        <li>Viajes colaborativos</li>
        <li>Exportación PDF/Excel</li>
        <li>Análisis avanzados de gastos</li>
        <li>Soporte prioritario 24/7</li>
    </ul>
    
    <p>Para completar tu suscripción, completa el pago antes de que termine tu período de prueba.</p>
    
    <p>¡Disfruta de todas las funciones premium!</p>
    
    <p>Saludos,<br>El equipo de Voyaj</p>
</body>
</html>
"""

    def _payment_pending_template(self, data: Dict[str, Any]) -> str:
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Completa tu suscripción a Voyaj</title>
</head>
<body>
    <h1>¡Hola {data.get('user_name', 'Viajero')}!</h1>
    
    <p>Tu período de prueba del plan {data.get('plan_name', 'Premium')} está activo.</p>
    
    <p>Para continuar disfrutando de todas las funciones premium después del período de prueba, completa tu pago.</p>
    
    <p>Tienes 7 días para completar el proceso sin perder acceso a las funciones premium.</p>
    
    <p>Si tienes preguntas, nuestro equipo está aquí para ayudarte.</p>
    
    <p>Saludos,<br>El equipo de Voyaj</p>
</body>
</html>
"""

    def _payment_successful_template(self, data: Dict[str, Any]) -> str:
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Pago confirmado - Voyaj</title>
</head>
<body>
    <h1>¡Pago confirmado, {data.get('user_name', 'Viajero')}!</h1>
    
    <p>Tu suscripción al plan {data.get('plan_name', 'Premium')} está ahora activa.</p>
    
    <p>Ya puedes disfrutar de todas las funciones premium sin límites.</p>
    
    <p>Tu próxima facturación será el próximo mes. Puedes gestionar tu suscripción desde tu perfil en cualquier momento.</p>
    
    <p>¡Gracias por elegir Voyaj para tus aventuras!</p>
    
    <p>Saludos,<br>El equipo de Voyaj</p>
</body>
</html>
"""

    def _payment_failed_template(self, data: Dict[str, Any]) -> str:
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Problema con tu pago - Voyaj</title>
</head>
<body>
    <h1>Hola {data.get('user_name', 'Viajero')},</h1>
    
    <p>Tuvimos un problema procesando tu pago para Voyaj.</p>
    
    <p>No te preocupes, tu cuenta sigue activa por ahora. Para evitar la interrupción del servicio, actualiza tu método de pago.</p>
    
    {f'<p><a href="{data.get("retry_url")}">Actualizar método de pago</a></p>' if data.get('retry_url') else ''}
    
    <p>Si necesitas ayuda, contáctanos. Estamos aquí para asistirte.</p>
    
    <p>Saludos,<br>El equipo de Voyaj</p>
</body>
</html>
"""

    def _subscription_renewed_template(self, data: Dict[str, Any]) -> str:
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Suscripción renovada - Voyaj</title>
</head>
<body>
    <h1>¡Suscripción renovada, {data.get('user_name', 'Viajero')}!</h1>
    
    <p>Tu suscripción al plan {data.get('plan_name', 'Premium')} se ha renovado exitosamente.</p>
    
    <p>Continúas teniendo acceso completo a todas las funciones premium por otro mes más.</p>
    
    <p>Tu próxima renovación será automática el próximo mes.</p>
    
    <p>¡Sigue explorando el mundo con Voyaj!</p>
    
    <p>Saludos,<br>El equipo de Voyaj</p>
</body>
</html>
"""

    def _upgrade_confirmation_template(self, data: Dict[str, Any]) -> str:
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Upgrade confirmado - Voyaj</title>
</head>
<body>
    <h1>¡Upgrade confirmado, {data.get('user_name', 'Viajero')}!</h1>
    
    <p>Has actualizado exitosamente al plan {data.get('plan_name', 'Premium')}.</p>
    
    <p>Ya tienes acceso inmediato a todas las nuevas funciones de tu plan actualizado.</p>
    
    <p>El cambio se reflejará en tu próxima factura de forma proporcional.</p>
    
    <p>¡Disfruta de las nuevas funciones premium!</p>
    
    <p>Saludos,<br>El equipo de Voyaj</p>
</body>
</html>
"""

    def _downgrade_warning_template(self, data: Dict[str, Any]) -> str:
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Cambio de plan programado - Voyaj</title>
</head>
<body>
    <h1>Hola {data.get('user_name', 'Viajero')},</h1>
    
    <p>Tu plan cambiará al final del período actual de facturación.</p>
    
    <p>Mantienes acceso completo a las funciones premium hasta {data.get('access_until', 'el final del período')}.</p>
    
    <p>Después de esta fecha, tu cuenta se ajustará a los límites del nuevo plan.</p>
    
    <p>Tus datos se mantendrán seguros, pero algunas funciones pueden quedar limitadas.</p>
    
    <p>Si cambias de opinión, puedes reactivar tu suscripción en cualquier momento.</p>
    
    <p>Saludos,<br>El equipo de Voyaj</p>
</body>
</html>
"""

    def _cancellation_confirmation_template(self, data: Dict[str, Any]) -> str:
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Suscripción cancelada - Voyaj</title>
</head>
<body>
    <h1>Suscripción cancelada, {data.get('user_name', 'Viajero')}</h1>
    
    <p>Hemos procesado la cancelación de tu suscripción al plan {data.get('plan_name', 'Premium')}.</p>
    
    <p>Mantienes acceso completo hasta {data.get('access_until', 'el final del período pagado')}.</p>
    
    <p>Después de esta fecha, tu cuenta volverá al plan gratuito Explorador.</p>
    
    <p>Todos tus datos permanecerán seguros y podrás reactivar tu suscripción cuando gustes.</p>
    
    <p>Lamentamos verte partir. ¡Esperamos tenerte de vuelta pronto!</p>
    
    <p>Saludos,<br>El equipo de Voyaj</p>
</body>
</html>
"""

    def _limit_reached_template(self, data: Dict[str, Any]) -> str:
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Límite alcanzado - Voyaj</title>
</head>
<body>
    <h1>¡Límite alcanzado, {data.get('user_name', 'Explorador')}!</h1>
    
    <p>Has alcanzado el límite de tu plan actual: {data.get('limit_message', 'límite de plan')}.</p>
    
    <p>Para continuar usando esta función, considera actualizar a un plan premium.</p>
    
    <p>Con los planes premium tendrás:</p>
    <ul>
        <li>Viajes ilimitados</li>
        <li>Fotos ilimitadas</li>
        <li>Colaboración con amigos</li>
        <li>Y mucho más</li>
    </ul>
    
    <p>¡Actualiza ahora y sigue explorando sin límites!</p>
    
    <p>Saludos,<br>El equipo de Voyaj</p>
</body>
</html>
"""

    def _trial_ending_template(self, data: Dict[str, Any]) -> str:
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Tu período de prueba termina pronto - Voyaj</title>
</head>
<body>
    <h1>¡Tu período de prueba termina pronto, {data.get('user_name', 'Viajero')}!</h1>
    
    <p>Tu período de prueba gratuito del plan {data.get('plan_name', 'Premium')} termina en {data.get('days_remaining', '3')} días.</p>
    
    <p>Para continuar disfrutando de todas las funciones premium, no se requiere acción de tu parte - tu suscripción se activará automáticamente.</p>
    
    <p>Si prefieres cancelar, puedes hacerlo desde tu perfil antes de que termine el período de prueba.</p>
    
    <p>¡Esperamos que hayas disfrutado explorando todas las funciones premium!</p>
    
    <p>Saludos,<br>El equipo de Voyaj</p>
</body>
</html>
"""

    def _subscription_expired_template(self, data: Dict[str, Any]) -> str:
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Tu suscripción ha expirado - Voyaj</title>
</head>
<body>
    <h1>Tu suscripción ha expirado, {data.get('user_name', 'Viajero')}</h1>
    
    <p>Tu suscripción al plan {data.get('plan_name', 'Premium')} ha expirado.</p>
    
    <p>Tu cuenta ha vuelto al plan gratuito Explorador. Todos tus datos están seguros.</p>
    
    <p>Puedes reactivar tu suscripción premium en cualquier momento para recuperar el acceso completo a todas las funciones.</p>
    
    <p>¡Te extrañamos! Esperamos verte de vuelta pronto.</p>
    
    <p>Saludos,<br>El equipo de Voyaj</p>
</body>
</html>
"""