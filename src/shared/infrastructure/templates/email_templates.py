from typing import Dict, Any

class EmailTemplates:
    
    def get_template(self, template_type: str, data: Dict[str, Any]) -> str:
        templates = {
            "verification": self._verification_template,
            "password_reset": self._password_reset_template,
            "subscription_activated": self._subscription_activated_template,
            "subscription_expired": self._subscription_expired_template,
            "subscription_cancelled": self._subscription_cancelled_template,
            "subscription_expiring_soon": self._subscription_expiring_soon_template
        }
        
        template_func = templates.get(template_type)
        if not template_func:
            raise ValueError(f"Template type '{template_type}' not found")
        
        return template_func(data)

    def _verification_template(self, data: Dict[str, Any]) -> str:
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verifica tu cuenta</title>
</head>
<body>
    <h1>{data.get('app_name', 'Voyaj')}</h1>
    
    <h2>¡Hola {data.get('user_name', 'Usuario')}!</h2>
    
    <p>Gracias por registrarte en {data.get('app_name', 'Voyaj')}. Para completar tu registro, por favor verifica tu cuenta usando el siguiente código:</p>
    
    <h3>Código de verificación: {data.get('verification_token')}</h3>
    
    <p>Este código expira en 24 horas.</p>
    
    <p>Si no solicitaste esta verificación, puedes ignorar este email.</p>
    
    <p>Saludos,<br>El equipo de {data.get('app_name', 'Voyaj')}</p>
</body>
</html>
"""

    def _password_reset_template(self, data: Dict[str, Any]) -> str:
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Restablecer contraseña</title>
</head>
<body>
    <h1>{data.get('app_name', 'Voyaj')}</h1>
    
    <h2>¡Hola {data.get('user_name', 'Usuario')}!</h2>
    
    <p>Recibimos una solicitud para restablecer tu contraseña. Usa el siguiente código para cambiar tu contraseña:</p>
    
    <h3>Código de restablecimiento: {data.get('reset_token')}</h3>
    
    <p>Este código expira en 1 hora.</p>
    
    <p>Si no solicitaste este restablecimiento, puedes ignorar este email.</p>
    
    <p>Saludos,<br>El equipo de {data.get('app_name', 'Voyaj')}</p>
</body>
</html>
"""

    def _subscription_activated_template(self, data: Dict[str, Any]) -> str:
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>¡Bienvenido a Voyaj PRO!</title>
</head>
<body>
    <h1>¡Tu plan PRO está activo!</h1>
    
    <h2>¡Hola {data.get('user_name', 'Viajero')}!</h2>
    
    <p>¡Genial! Tu suscripción al plan {data.get('plan_name', 'PRO')} está ahora activa.</p>
    
    <p><strong>Beneficios de tu plan PRO:</strong></p>
    <ul>
        <li>✈️ Viajes ilimitados</li>
        <li>📸 Fotos ilimitadas</li>
        <li>💰 Control avanzado de gastos</li>
        <li>📝 Diario de viaje completo</li>
    </ul>
    
    <p>Tu suscripción es válida por {data.get('expires_days', 30)} días.</p>
    
    <p>¡Disfruta planeando tus aventuras sin límites!</p>
    
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
    <title>Tu plan PRO ha expirado</title>
</head>
<body>
    <h1>Tu plan {data.get('plan_name', 'PRO')} ha expirado</h1>
    
    <h2>Hola {data.get('user_name', 'Viajero')},</h2>
    
    <p>Tu suscripción mensual al plan {data.get('plan_name', 'PRO')} ha expirado.</p>
    
    <p>Tu cuenta ha vuelto automáticamente al <strong>plan FREE</strong>:</p>
    <ul>
        <li>📱 1 viaje activo</li>
        <li>📸 Fotos limitadas</li>
        <li>💰 Control básico de gastos</li>
    </ul>
    
    <p>Todos tus datos están seguros y se mantienen guardados.</p>
    
    <p><strong>¿Quieres volver a PRO?</strong><br>
    Puedes renovar tu suscripción en cualquier momento desde la app.</p>
    
    <p>¡Te esperamos de vuelta!</p>
    
    <p>Saludos,<br>El equipo de Voyaj</p>
</body>
</html>
"""

    def _subscription_cancelled_template(self, data: Dict[str, Any]) -> str:
        return f"""
<!DOCTYPE html>  
<html>
<head>
    <meta charset="utf-8">
    <title>Suscripción cancelada</title>
</head>
<body>
    <h1>Suscripción cancelada</h1>
    
    <h2>Hola {data.get('user_name', 'Viajero')},</h2>
    
    <p>Hemos procesado la cancelación de tu suscripción al plan {data.get('plan_name', 'PRO')}.</p>
    
    <p>Tu cuenta ha vuelto al <strong>plan FREE</strong> inmediatamente.</p>
    
    <p>Todos tus viajes y datos permanecen seguros y puedes reactivar tu suscripción PRO cuando gustes.</p>
    
    <p>¡Lamentamos verte partir, pero esperamos tenerte de vuelta pronto!</p>
    
    <p>Saludos,<br>El equipo de Voyaj</p>
</body>
</html>
"""

    def _subscription_expiring_soon_template(self, data: Dict[str, Any]) -> str:
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Tu plan PRO expira pronto</title>
</head>
<body>
    <h1>Tu plan PRO expira en {data.get('days_remaining', 7)} días</h1>
    
    <h2>¡Hola {data.get('user_name', 'Viajero')}!</h2>
    
    <p>Tu suscripción al plan PRO expira el <strong>{data.get('expiration_date', 'próximamente')}</strong>.</p>
    
    <p>Para seguir disfrutando de todos los beneficios PRO:</p>
    <ul>
        <li>✈️ Viajes ilimitados</li>
        <li>📸 Fotos ilimitadas</li>
        <li>💰 Control avanzado de gastos</li>
    </ul>
    
    <p><strong>Renueva tu suscripción</strong> antes de que expire para no perder el acceso.</p>
    
    <p>Si no renuevas, tu cuenta volverá automáticamente al plan FREE.</p>
    
    <p>¡Gracias por viajar con nosotros!</p>
    
    <p>Saludos,<br>El equipo de Voyaj</p>
</body>
</html>
"""