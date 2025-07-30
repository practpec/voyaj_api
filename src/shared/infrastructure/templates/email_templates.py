from typing import Dict, Any

class EmailTemplates:
    
    def get_template(self, template_type: str, data: Dict[str, Any]) -> str:
        templates = {
            "verification": self._verification_template,
            "password_reset": self._password_reset_template
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