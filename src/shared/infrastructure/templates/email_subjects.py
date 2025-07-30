class EmailSubjects:
    
    def __init__(self):
        self.subjects = {
            "verification": "Verifica tu cuenta en Voyaj",
            "password_reset": "Restablece tu contraseña en Voyaj",
            "trip_invitation": "Te han invitado a un viaje en Voyaj"
        }
    
    def get_subject(self, template_type: str) -> str:
        subject = self.subjects.get(template_type)
        if not subject:
            raise ValueError(f"Subject for template type '{template_type}' not found")
        return subject